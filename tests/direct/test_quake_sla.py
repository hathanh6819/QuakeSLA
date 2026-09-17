import json
from unittest.mock import patch
import pytest


CONTRACT = "contracts/quake_sla.py"
STUDIO_RUNNER = "5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng"
DIRECT_RUNNER = "1zr6nqk597d97kg0dyxg0shhrykx5v02zjgnyrajapy4wlqvfvwh"
OWNER = "0x1111111111111111111111111111111111111111"
BENEFICIARY = "0x2222222222222222222222222222222222222222"
EXECUTOR = "0x3333333333333333333333333333333333333333"


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


def event(event_id="us7000thsp", mag=4.8, time=1789543705040, lat=38.0, lon=-120.0, status="reviewed"):
    return {
        "type": "Feature",
        "id": event_id,
        "properties": {"mag": mag, "time": time, "status": status, "type": "earthquake", "place": "Test region"},
        "geometry": {"type": "Point", "coordinates": [lon, lat, 10.0]},
    }


def create_policy(contract):
    return contract.create_policy(
        BENEFICIARY, EXECUTOR, "Regional API availability", "Western US", 45,
        1788886800000, 1791478800000, 240000, 500000, -1260000, -650000,
    )


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
    assert json.loads(contract.get_policy(1))["status"] == "READY"


@pytest.mark.parametrize(
    "payload,reason",
    [
        (event(mag=3.2), "BELOW_MAGNITUDE_THRESHOLD"),
        (event(time=1800000000000), "OUTSIDE_COVERAGE_WINDOW"),
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
    direct_vm.sender = EXECUTOR
    assert contract.consume_authorization(1, 2) == "CONSUMED"
    with pytest.raises(Exception, match="STALE_REVISION|AUTHORIZATION_ALREADY_CONSUMED|AUTHORIZATION_NOT_READY"):
        contract.consume_authorization(1, 2)


def test_unauthorized_consumer_rejected(direct_vm, deploy_quake):
    direct_vm.sender = OWNER
    contract = deploy_quake()
    create_policy(contract)
    direct_vm.mock_web(r".*us7000thsp\.geojson", {"status": 200, "body": json.dumps(event())})
    contract.assess_event(1, "us7000thsp", 1)
    with pytest.raises(Exception, match="ONLY_EXECUTION_AUTHORITY"):
        contract.consume_authorization(1, 2)
