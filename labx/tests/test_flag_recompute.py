"""Tests for flag recomputation — boundary cases."""

from labx.domain.flags import compute_flag
from labx.domain.models import Flag, ReferenceRange


class TestComputeFlag:
    def test_normal_within_range(self):
        ref = ReferenceRange(low=3.5, high=5.1)
        assert compute_flag(4.0, ref) == Flag.normal

    def test_exactly_at_low_boundary(self):
        ref = ReferenceRange(low=3.5, high=5.1)
        assert compute_flag(3.5, ref) == Flag.normal

    def test_exactly_at_high_boundary(self):
        ref = ReferenceRange(low=3.5, high=5.1)
        assert compute_flag(5.1, ref) == Flag.normal

    def test_slightly_high(self):
        ref = ReferenceRange(low=3.5, high=5.1)
        assert compute_flag(5.2, ref) == Flag.high

    def test_slightly_low(self):
        ref = ReferenceRange(low=3.5, high=5.1)
        assert compute_flag(3.4, ref) == Flag.low

    def test_critical_high_default_multiplier(self):
        # Range span = 5.1 - 3.5 = 1.6
        # Critical threshold = 5.1 + 1.6 * 0.5 = 5.9
        ref = ReferenceRange(low=3.5, high=5.1)
        assert compute_flag(6.0, ref) == Flag.critical_high

    def test_critical_low_default_multiplier(self):
        # Critical threshold = 3.5 - 1.6 * 0.5 = 2.7
        ref = ReferenceRange(low=3.5, high=5.1)
        assert compute_flag(2.5, ref) == Flag.critical_low

    def test_high_not_critical_yet(self):
        # Value 5.5 is above 5.1 but below 5.9
        ref = ReferenceRange(low=3.5, high=5.1)
        assert compute_flag(5.5, ref) == Flag.high

    def test_potassium_tighter_critical(self):
        # Potassium has multiplier 0.20
        # Range span = 5.1 - 3.5 = 1.6
        # Critical threshold = 5.1 + 1.6 * 0.20 = 5.42
        ref = ReferenceRange(low=3.5, high=5.1)
        assert compute_flag(5.5, ref, analyte_key="potassium") == Flag.critical_high

    def test_no_ref_range_always_normal(self):
        ref = ReferenceRange()
        assert compute_flag(999.0, ref) == Flag.normal

    def test_upper_bound_only(self):
        ref = ReferenceRange(high=5.0)
        assert compute_flag(3.0, ref) == Flag.normal
        assert compute_flag(5.5, ref) == Flag.high

    def test_lower_bound_only(self):
        ref = ReferenceRange(low=1.0)
        assert compute_flag(2.0, ref) == Flag.normal
        # With only a lower bound (no high), span is 0 → any value below is critical
        assert compute_flag(0.5, ref) == Flag.critical_low

    def test_lower_bound_only_with_range(self):
        # With both bounds, there is a span, so slightly below is just "low"
        ref = ReferenceRange(low=1.0, high=5.0)
        assert compute_flag(0.8, ref) == Flag.low

    def test_troponin_any_elevation_critical(self):
        # Troponin_i has multiplier 0.0 → any value above high is critical
        ref = ReferenceRange(low=0.0, high=0.04)
        assert compute_flag(0.05, ref, analyte_key="troponin_i") == Flag.critical_high

    def test_sodium_tight_critical(self):
        # Sodium has multiplier 0.10
        # Range span = 145 - 136 = 9
        # Critical threshold = 145 + 9 * 0.10 = 145.9
        ref = ReferenceRange(low=136.0, high=145.0)
        assert compute_flag(146.0, ref, analyte_key="sodium") == Flag.critical_high
