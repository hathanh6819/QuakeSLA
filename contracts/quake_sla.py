# v0.3.0
# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import hashlib
import json
from datetime import datetime
import genlayer as gl
from genlayer.types import *
from genlayer.storage import TreeMap


USGS_DETAIL_PREFIX = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/"
USGS_DETAIL_SUFFIX = ".geojson"
MAX_SOURCE_BYTES = 20000
MAX_POLICIES_PER_OWNER = 100
MAX_COVERAGE_DURATION_MS = 5 * 365 * 24 * 60 * 60 * 1000


def _sender() -> str:
    return str(gl.message.sender_address).lower()


def _valid_address(value: str) -> bool:
    text = value.strip().lower()
    return len(text) == 42 and text.startswith("0x") and all(c in "0123456789abcdef" for c in text[2:])


def _valid_event_id(value: str) -> bool:
    if len(value) < 6 or len(value) > 32:
        return False
    return all(c in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in value)


def _stable(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _now_ms() -> int:
    raw = str(gl.message_raw["datetime"])
    return int(datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp() * 1000)


def _valid_identifier(value: str) -> bool:
    return 3 <= len(value) <= 96 and all(c in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.:-" for c in value)


def _valid_sha256(value: str) -> bool:
    return len(value) == 71 and value.startswith("sha256:") and all(c in "0123456789abcdef" for c in value[7:])


class QuakeSLA(gl.contract.Contract):
    policy_count: u256
    owner_policy_count: TreeMap[str, u256]
    owner_agreement_policy: TreeMap[str, u256]

    policy_owner: TreeMap[u256, str]
    policy_agreement_id: TreeMap[u256, str]
    policy_action_digest: TreeMap[u256, str]
    policy_credit_unit: TreeMap[u256, str]
    policy_max_credit: TreeMap[u256, u256]
    policy_created_at_ms: TreeMap[u256, u256]
    policy_beneficiary: TreeMap[u256, str]
    policy_executor: TreeMap[u256, str]
    policy_service: TreeMap[u256, str]
    policy_region: TreeMap[u256, str]
    policy_min_magnitude_tenths: TreeMap[u256, u256]
    policy_coverage_start_ms: TreeMap[u256, u256]
    policy_coverage_end_ms: TreeMap[u256, u256]
    policy_min_lat_e4: TreeMap[u256, i256]
    policy_max_lat_e4: TreeMap[u256, i256]
    policy_min_lon_e4: TreeMap[u256, i256]
    policy_max_lon_e4: TreeMap[u256, i256]
    policy_revision: TreeMap[u256, u256]
    policy_status: TreeMap[u256, str]

    assessment_event_id: TreeMap[u256, str]
    assessment_verdict: TreeMap[u256, str]
    assessment_reason: TreeMap[u256, str]
    assessment_evidence: TreeMap[u256, str]
    assessment_attempts: TreeMap[u256, u256]
    authorization_consumed: TreeMap[u256, u256]
    authorization_consumed_by: TreeMap[u256, str]

    def __init__(self):
        self.policy_count = 0

    @gl.public.write
    def create_policy(
        self,
        agreement_id: str,
        action_digest: str,
        credit_unit: str,
        max_credit: u256,
        beneficiary: str,
        executor: str,
        service_name: str,
        region_name: str,
        min_magnitude_tenths: u256,
        coverage_start_ms: u256,
        coverage_end_ms: u256,
        min_lat_e4: i256,
        max_lat_e4: i256,
        min_lon_e4: i256,
        max_lon_e4: i256,
    ) -> u256:
        agreement = agreement_id.strip()
        action = action_digest.strip().lower()
        unit = credit_unit.strip().upper()
        beneficiary_text = beneficiary.strip().lower()
        executor_text = executor.strip().lower()
        service = service_name.strip()
        region = region_name.strip()
        if not _valid_identifier(agreement):
            raise gl.vm.UserError("INVALID_AGREEMENT_ID")
        if not _valid_sha256(action):
            raise gl.vm.UserError("INVALID_ACTION_DIGEST")
        if not _valid_identifier(unit):
            raise gl.vm.UserError("INVALID_CREDIT_UNIT")
        if max_credit == 0:
            raise gl.vm.UserError("INVALID_MAX_CREDIT")
        if not _valid_address(beneficiary_text):
            raise gl.vm.UserError("INVALID_BENEFICIARY")
        if not _valid_address(executor_text):
            raise gl.vm.UserError("INVALID_EXECUTOR")
        if len(service) < 3 or len(service) > 80:
            raise gl.vm.UserError("INVALID_SERVICE_NAME")
        if len(region) < 2 or len(region) > 80:
            raise gl.vm.UserError("INVALID_REGION_NAME")
        if min_magnitude_tenths < 10 or min_magnitude_tenths > 100:
            raise gl.vm.UserError("INVALID_MAGNITUDE_THRESHOLD")
        created_at_ms = _now_ms()
        if coverage_start_ms <= created_at_ms or coverage_end_ms <= coverage_start_ms:
            raise gl.vm.UserError("INVALID_COVERAGE_WINDOW")
        if coverage_end_ms - coverage_start_ms > MAX_COVERAGE_DURATION_MS:
            raise gl.vm.UserError("COVERAGE_DURATION_TOO_LONG")
        if min_lat_e4 < -900000 or max_lat_e4 > 900000 or min_lat_e4 > max_lat_e4:
            raise gl.vm.UserError("INVALID_LATITUDE_BOUNDS")
        if min_lon_e4 < -1800000 or max_lon_e4 > 1800000 or min_lon_e4 > max_lon_e4:
            raise gl.vm.UserError("INVALID_LONGITUDE_BOUNDS")
        owner = _sender()
        owner_count = self.owner_policy_count.get(owner) or 0
        if owner_count >= MAX_POLICIES_PER_OWNER:
            raise gl.vm.UserError("OWNER_POLICY_LIMIT_REACHED")
        agreement_key = owner + ":" + agreement
        if (self.owner_agreement_policy.get(agreement_key) or 0) != 0:
            raise gl.vm.UserError("AGREEMENT_ALREADY_REGISTERED")

        policy_id = self.policy_count + 1
        self.policy_count = policy_id
        self.owner_policy_count[owner] = owner_count + 1
        self.owner_agreement_policy[agreement_key] = policy_id
        self.policy_owner[policy_id] = owner
        self.policy_agreement_id[policy_id] = agreement
        self.policy_action_digest[policy_id] = action
        self.policy_credit_unit[policy_id] = unit
        self.policy_max_credit[policy_id] = max_credit
        self.policy_created_at_ms[policy_id] = created_at_ms
        self.policy_beneficiary[policy_id] = beneficiary_text
        self.policy_executor[policy_id] = executor_text
        self.policy_service[policy_id] = service
        self.policy_region[policy_id] = region
        self.policy_min_magnitude_tenths[policy_id] = min_magnitude_tenths
        self.policy_coverage_start_ms[policy_id] = coverage_start_ms
        self.policy_coverage_end_ms[policy_id] = coverage_end_ms
        self.policy_min_lat_e4[policy_id] = min_lat_e4
        self.policy_max_lat_e4[policy_id] = max_lat_e4
        self.policy_min_lon_e4[policy_id] = min_lon_e4
        self.policy_max_lon_e4[policy_id] = max_lon_e4
        self.policy_revision[policy_id] = 1
        self.policy_status[policy_id] = "ACTIVE"
        self.assessment_verdict[policy_id] = "UNASSESSED"
        self.assessment_attempts[policy_id] = 0
        self.authorization_consumed[policy_id] = 0
        return policy_id

    @gl.public.write
    def cancel_policy(self, policy_id: u256, expected_revision: u256) -> str:
        key = policy_id
        self._require_policy(key)
        if self.policy_owner[key] != _sender():
            raise gl.vm.UserError("ONLY_POLICY_OWNER")
        if self.policy_revision[key] != expected_revision:
            raise gl.vm.UserError("STALE_REVISION")
        if self.policy_status[key] != "ACTIVE":
            raise gl.vm.UserError("POLICY_NOT_ACTIVE")
        self.policy_status[key] = "CANCELLED"
        self.policy_revision[key] = self.policy_revision[key] + 1
        return "CANCELLED"

    @gl.public.write
    def assess_event(self, policy_id: u256, event_id: str, expected_revision: u256) -> str:
        key = policy_id
        self._require_policy(key)
        event = event_id.strip()
        caller = _sender()
        if caller != self.policy_owner[key] and caller != self.policy_beneficiary[key]:
            raise gl.vm.UserError("ONLY_POLICY_PARTY")
        if self.policy_revision[key] != expected_revision:
            raise gl.vm.UserError("STALE_REVISION")
        if self.policy_status[key] not in ("ACTIVE", "UNRESOLVED"):
            raise gl.vm.UserError("POLICY_NOT_ASSESSABLE")
        if not _valid_event_id(event):
            raise gl.vm.UserError("INVALID_EVENT_ID")

        source_url = USGS_DETAIL_PREFIX + event + USGS_DETAIL_SUFFIX
        min_mag = int(self.policy_min_magnitude_tenths[key])
        start_ms = int(self.policy_coverage_start_ms[key])
        end_ms = int(self.policy_coverage_end_ms[key])
        min_lat = int(self.policy_min_lat_e4[key])
        max_lat = int(self.policy_max_lat_e4[key])
        min_lon = int(self.policy_min_lon_e4[key])
        max_lon = int(self.policy_max_lon_e4[key])

        def observe() -> str:
            try:
                response = gl.nondet.web.get(source_url)
                body = response.body or b""
                if len(body) == 0 or len(body) > MAX_SOURCE_BYTES:
                    return _stable({"kind": "UNRESOLVED", "reason": "SOURCE_SIZE_INVALID"})
                data = json.loads(body.decode("utf-8"))
                if data.get("type") != "Feature" or data.get("id") != event:
                    return _stable({"kind": "UNRESOLVED", "reason": "EVENT_IDENTITY_MISMATCH"})
                properties = data.get("properties") or {}
                geometry = data.get("geometry") or {}
                coordinates = geometry.get("coordinates") or []
                if len(coordinates) < 2:
                    return _stable({"kind": "UNRESOLVED", "reason": "COORDINATES_MISSING"})
                status = str(properties.get("status", "")).lower()
                event_type = str(properties.get("type", "")).lower()
                magnitude = properties.get("mag")
                event_time = properties.get("time")
                if status != "reviewed":
                    return _stable({"kind": "UNRESOLVED", "reason": "USGS_NOT_REVIEWED"})
                if event_type != "earthquake" or not isinstance(magnitude, (int, float)) or not isinstance(event_time, int):
                    return _stable({"kind": "UNRESOLVED", "reason": "EVENT_FIELDS_INVALID"})
                magnitude_tenths = int(round(float(magnitude) * 10))
                longitude_e4 = int(round(float(coordinates[0]) * 10000))
                latitude_e4 = int(round(float(coordinates[1]) * 10000))
                within_time = start_ms <= event_time <= end_ms
                within_region = min_lat <= latitude_e4 <= max_lat and min_lon <= longitude_e4 <= max_lon
                meets_magnitude = magnitude_tenths >= min_mag
                approved = within_time and within_region and meets_magnitude
                if not within_time:
                    reason = "OUTSIDE_COVERAGE_WINDOW"
                elif not within_region:
                    reason = "OUTSIDE_COVERED_REGION"
                elif not meets_magnitude:
                    reason = "BELOW_MAGNITUDE_THRESHOLD"
                else:
                    reason = "USGS_REVIEWED_EVENT_MATCH"
                return _stable({
                    "action_digest": self.policy_action_digest[key],
                    "agreement_id": self.policy_agreement_id[key],
                    "credit_unit": self.policy_credit_unit[key],
                    "event_id": event,
                    "event_time_ms": event_time,
                    "latitude_e4": latitude_e4,
                    "longitude_e4": longitude_e4,
                    "magnitude_tenths": magnitude_tenths,
                    "place": str(properties.get("place", ""))[:160],
                    "reason": reason,
                    "sha256": hashlib.sha256(body).hexdigest(),
                    "source": source_url,
                    "status": status,
                    "verdict": "APPROVED" if approved else "DENIED",
                })
            except Exception:
                return _stable({"kind": "UNRESOLVED", "reason": "SOURCE_UNAVAILABLE_OR_MALFORMED"})

        receipt = gl.eq_principle.strict_eq(observe)
        parsed = json.loads(receipt)
        verdict = str(parsed.get("verdict", parsed.get("kind", "UNRESOLVED")))
        reason = str(parsed.get("reason", "UNKNOWN"))
        self.assessment_event_id[key] = event
        self.assessment_verdict[key] = verdict
        self.assessment_reason[key] = reason
        self.assessment_evidence[key] = receipt
        self.assessment_attempts[key] = self.assessment_attempts[key] + 1
        self.policy_revision[key] = self.policy_revision[key] + 1
        if verdict == "APPROVED":
            self.policy_status[key] = "READY"
        elif verdict == "DENIED":
            self.policy_status[key] = "DENIED"
        else:
            self.policy_status[key] = "UNRESOLVED"
        return receipt

    @gl.public.write
    def consume_authorization(self, policy_id: u256, expected_revision: u256, action_digest: str, credit_amount: u256) -> str:
        key = policy_id
        self._require_policy(key)
        if self.policy_executor[key] != _sender():
            raise gl.vm.UserError("ONLY_EXECUTION_AUTHORITY")
        if self.policy_revision[key] != expected_revision:
            raise gl.vm.UserError("STALE_REVISION")
        if action_digest.strip().lower() != self.policy_action_digest[key]:
            raise gl.vm.UserError("ACTION_DIGEST_MISMATCH")
        if credit_amount == 0 or credit_amount > self.policy_max_credit[key]:
            raise gl.vm.UserError("CREDIT_AMOUNT_OUT_OF_SCOPE")
        if self.policy_status[key] != "READY" or self.assessment_verdict[key] != "APPROVED":
            raise gl.vm.UserError("AUTHORIZATION_NOT_READY")
        if self.authorization_consumed[key] != 0:
            raise gl.vm.UserError("AUTHORIZATION_ALREADY_CONSUMED")
        self.authorization_consumed[key] = 1
        self.authorization_consumed_by[key] = _sender()
        self.policy_status[key] = "CONSUMED"
        self.policy_revision[key] = self.policy_revision[key] + 1
        return "CONSUMED"

    @gl.public.view
    def get_policy_count(self) -> u256:
        return self.policy_count

    @gl.public.view
    def get_policy(self, policy_id: u256) -> str:
        key = policy_id
        self._require_policy(key)
        return _stable({
            "action_digest": self.policy_action_digest[key],
            "assessment_attempts": int(self.assessment_attempts[key]),
            "agreement_id": self.policy_agreement_id[key],
            "beneficiary": self.policy_beneficiary[key],
            "consumed": int(self.authorization_consumed[key]),
            "consumed_by": self.authorization_consumed_by.get(key) or "",
            "coverage_end_ms": int(self.policy_coverage_end_ms[key]),
            "coverage_start_ms": int(self.policy_coverage_start_ms[key]),
            "created_at_ms": int(self.policy_created_at_ms[key]),
            "credit_unit": self.policy_credit_unit[key],
            "event_id": self.assessment_event_id.get(key) or "",
            "executor": self.policy_executor[key],
            "max_lat_e4": int(self.policy_max_lat_e4[key]),
            "max_lon_e4": int(self.policy_max_lon_e4[key]),
            "max_credit": int(self.policy_max_credit[key]),
            "min_lat_e4": int(self.policy_min_lat_e4[key]),
            "min_lon_e4": int(self.policy_min_lon_e4[key]),
            "min_magnitude_tenths": int(self.policy_min_magnitude_tenths[key]),
            "owner": self.policy_owner[key],
            "policy_id": int(policy_id),
            "region": self.policy_region[key],
            "revision": int(self.policy_revision[key]),
            "service": self.policy_service[key],
            "status": self.policy_status[key],
            "verdict": self.assessment_verdict[key],
        })

    @gl.public.view
    def get_evidence(self, policy_id: u256) -> str:
        key = policy_id
        self._require_policy(key)
        return self.assessment_evidence.get(key) or ""

    def _require_policy(self, key: u256) -> None:
        if key == 0 or key > self.policy_count:
            raise gl.vm.UserError("POLICY_NOT_FOUND")
