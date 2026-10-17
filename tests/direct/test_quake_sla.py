import json
from datetime import datetime, timedelta
from unittest.mock import patch
import pytest


CONTRACT = "contracts/quake_sla.py"
STUDIO_RUNNER = "5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng"
DIRECT_RUNNER = "1zr6nqk597d97kg0dyxg0shhrykx5v02zjgnyrajapy4wlqvfvwh"
OWNER = "0x1111111111111111111111111111111111111111"
BENEFICIARY = "0x2222222222222222222222222222222222222222"
EXECUTOR = "0x3333333333333333333333333333333333333333"
ACTION_DIGEST = "sha256:" + "a" * 64


@pytest.fixture
def deploy_quake(direct_deploy, tmp_path):
    """Run identical source against the runner bundled with local gltest.

    Studio Next requires 5jyc..., which the current direct-test tarball does not
    ship. Only the Depends hash is substituted in a temporary copy; deployed
    source remains pinned to Studio Next's proven runner.
    """
    source = open(CONTRACT, encoding="utf-8").read()
    path = tmp_path / "quake_sla_direct.py"
    path.write_text(source.replace(STUDIO_RUNNER, DIRECT_RUNNER, 1), encoding="utf-8")
    def deploy():
        # gltest keeps its injected stdin descriptor open while trying to unlink
        # the backing tempfile. Windows rejects that unlink; POSIX permits it.
        # Suppressing only that cleanup call keeps the harness portable and does
        # not alter contract behavior.
        with patch("os.unlink"):
            return direct_deploy(str(path))

    return deploy


def event(event_id="us7000thsp", mag=4.8, time=1900500000000, lat=38.0, lon=-120.0, status="reviewed"):
    return {
        "type": "Feature",
        "id": event_id,
        "properties": {"mag": mag, "time": time, "status": status, "type": "earthquake", "place": "Test region"},
        "geometry": {"type": "Point", "coordinates": [lon, lat, 10.0]},
    }


def create_policy(contract, agreement_id="SLA-2026-001", action_digest=ACTION_DIGEST, max_credit=10000):
    return contract.create_policy(
        agreement_id, action_digest, "USD_CENTS", max_credit,
        BENEFICIARY, EXECUTOR, "Regional API availability", "Western US", 45,
        1900000000000, 1901000000000, 240000, 500000, -1260000, -650000,
    )


def warp_past_revalidation(direct_vm):
    current = datetime.fromisoformat(direct_vm._datetime.replace("Z", "+00:00"))
    direct_vm.warp((current + timedelta(hours=7)).isoformat())


def test_policy_registration_and_views(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    assert create_policy(contract) == 1
    policy = json.loads(contract.get_policy(1))
    assert policy["status"] == "ACTIVE"
    assert policy["revision"] == 1
    assert policy["min_magnitude_tenths"] == 45
    assert contract.get_policy_count() == 1


def test_reviewed_matching_event_authorizes(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event())})
    receipt = json.loads(contract.assess_event(1, "us7000thsp", 1))
    assert receipt["verdict"] == "APPROVED"
    assert receipt["reason"] == "USGS_REVIEWED_EVENT_MATCH"
    policy = json.loads(contract.get_policy(1))
    assert policy["status"] == "PENDING_CONFIRMATION"
    assert policy["evidence_drift"] == "AWAITING_REVALIDATION"


@pytest.mark.parametrize(
    "payload,reason",
    [
        (event(mag=3.2), "BELOW_MAGNITUDE_THRESHOLD"),
            (event(time=1902000000000), "OUTSIDE_COVERAGE_WINDOW"),
        (event(lat=60.0), "OUTSIDE_COVERED_REGION"),
    ],
)
def test_non_matching_evidence_is_denied(direct_vm, deploy_quake, payload, reason):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(payload)})
    receipt = json.loads(contract.assess_event(1, "us7000thsp", 1))
    assert receipt["verdict"] == "DENIED"
    assert receipt["reason"] == reason
    assert json.loads(contract.get_policy(1))["status"] == "ACTIVE"


def test_denied_claim_does_not_destroy_future_coverage(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event(mag=3.2))})
    first = json.loads(contract.assess_event(1, "us7000thsp", 1))
    assert first["verdict"] == "DENIED"
    direct_vm.mock_web(r".*us7000next\.geojson", {"status": 200, "body": json.dumps(event(event_id="us7000next"))})
    second = json.loads(contract.assess_event(1, "us7000next", 2))
    assert second["verdict"] == "APPROVED"
    assert json.loads(contract.get_policy(1))["status"] == "PENDING_CONFIRMATION"


def test_unreviewed_event_fails_closed_and_can_retry(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event(status="automatic"))})
    receipt = json.loads(contract.assess_event(1, "us7000thsp", 1))
    assert receipt == {"kind": "UNRESOLVED", "reason": "USGS_NOT_REVIEWED"}
    policy = json.loads(contract.get_policy(1))
    assert policy["status"] == "UNRESOLVED"
    assert policy["revision"] == 2


def test_wrong_identity_fails_closed(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event(event_id="spoofed"))})
    receipt = json.loads(contract.assess_event(1, "us7000thsp", 1))
    assert receipt["kind"] == "UNRESOLVED"
    assert receipt["reason"] == "EVENT_IDENTITY_MISMATCH"


def test_invalid_event_id_rejected_before_fetch(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    with pytest.raises(Exception, match="INVALID_EVENT_ID"):
        contract.assess_event(1, "../../admin", 1)


def test_stale_revision_rejected(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    with pytest.raises(Exception, match="STALE_REVISION"):
        contract.assess_event(1, "us7000thsp", 9)


def test_only_execution_authority_can_consume_once(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event())})
    contract.assess_event(1, "us7000thsp", 1)
    warp_past_revalidation(direct_vm)
    contract.confirm_event(1, 2)
    direct_vm.sender = EXECUTOR
    assert contract.consume_authorization(1, 3, ACTION_DIGEST, 10000) == "CONSUMED"
    policy = json.loads(contract.get_policy(1))
    assert policy["consumed_amount"] == 10000
    with pytest.raises(Exception, match="STALE_REVISION|AUTHORIZATION_ALREADY_CONSUMED|AUTHORIZATION_NOT_READY"):
        contract.consume_authorization(1, 3, ACTION_DIGEST, 10000)


def test_unauthorized_consumer_rejected(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event())})
    contract.assess_event(1, "us7000thsp", 1)
    warp_past_revalidation(direct_vm)
    contract.confirm_event(1, 2)
    with pytest.raises(Exception, match="ONLY_EXECUTION_AUTHORITY"):
        contract.consume_authorization(1, 3, ACTION_DIGEST, 10000)


def test_retroactive_policy_rejected(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    with pytest.raises(Exception, match="INVALID_COVERAGE_WINDOW"):
        contract.create_policy(
            "SLA-OLD", ACTION_DIGEST, "USD_CENTS", 10000,
            BENEFICIARY, EXECUTOR, "Regional API availability", "Western US", 45,
            1, 2, 240000, 500000, -1260000, -650000,
        )


def test_agreement_unique_per_owner(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    with pytest.raises(Exception, match="AGREEMENT_ALREADY_REGISTERED"):
        create_policy(contract)
    direct_vm.sender = BENEFICIARY
    assert create_policy(contract) == 2


def test_consume_scope_is_bound(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event())})
    contract.assess_event(1, "us7000thsp", 1)
    warp_past_revalidation(direct_vm)
    contract.confirm_event(1, 2)
    direct_vm.sender = EXECUTOR
    with pytest.raises(Exception, match="ACTION_DIGEST_MISMATCH"):
        contract.consume_authorization(1, 3, "sha256:" + "b" * 64, 10000)
    with pytest.raises(Exception, match="CREDIT_AMOUNT_OUT_OF_SCOPE"):
        contract.consume_authorization(1, 3, ACTION_DIGEST, 10001)
    assert contract.consume_authorization(1, 3, ACTION_DIGEST, 10000) == "CONSUMED"


def test_confirmation_delay_blocks_early_finality(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event())})
    contract.assess_event(1, "us7000thsp", 1)
    with pytest.raises(Exception, match="REVALIDATION_DELAY_ACTIVE"):
        contract.confirm_event(1, 2)


def test_stable_revalidation_unlocks_authorization(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    payload = event()
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(payload)})
    contract.assess_event(1, "us7000thsp", 1)
    warp_past_revalidation(direct_vm)
    receipt = json.loads(contract.confirm_event(1, 2))
    assert receipt["verdict"] == "APPROVED"
    policy = json.loads(contract.get_policy(1))
    assert policy["status"] == "READY"
    assert policy["evidence_drift"] == "UNCHANGED"
    history = json.loads(contract.get_evidence_history(1))
    assert history["initial"]["sha256"] == history["confirmation"]["sha256"]


def test_material_drift_can_revoke_candidate(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event())})
    contract.assess_event(1, "us7000thsp", 1)
    warp_past_revalidation(direct_vm)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event(mag=3.2))})
    receipt = json.loads(contract.confirm_event(1, 2))
    assert receipt["verdict"] == "DENIED"
    policy = json.loads(contract.get_policy(1))
    assert policy["status"] == "ACTIVE"
    assert policy["evidence_drift"] == "NO_LONGER_ELIGIBLE"


def test_material_drift_still_eligible_is_explicit(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event(mag=4.8))})
    contract.assess_event(1, "us7000thsp", 1)
    warp_past_revalidation(direct_vm)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event(mag=5.0))})
    contract.confirm_event(1, 2)
    policy = json.loads(contract.get_policy(1))
    assert policy["status"] == "READY"
    assert policy["evidence_drift"] == "MATERIAL_CHANGE_STILL_ELIGIBLE"
