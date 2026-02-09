"""Tests for reference range parsing."""

from labx.domain.reference import parse_reference_range


class TestParseReferenceRange:
    def test_standard_range(self):
        rr = parse_reference_range("3.5 - 5.1")
        assert rr.low == 3.5
        assert rr.high == 5.1

    def test_en_dash(self):
        rr = parse_reference_range("3.5\u20135.1")
        assert rr.low == 3.5
        assert rr.high == 5.1

    def test_em_dash(self):
        rr = parse_reference_range("3.5\u20145.1")
        assert rr.low == 3.5
        assert rr.high == 5.1

    def test_to_keyword(self):
        rr = parse_reference_range("3.5 to 5.1")
        assert rr.low == 3.5
        assert rr.high == 5.1

    def test_upper_only_le(self):
        rr = parse_reference_range("<= 5.0")
        assert rr.low is None
        assert rr.high == 5.0

    def test_upper_only_unicode(self):
        rr = parse_reference_range("\u22645.0")
        assert rr.low is None
        assert rr.high == 5.0

    def test_upper_only_lt(self):
        rr = parse_reference_range("< 5.0")
        assert rr.low is None
        assert rr.high == 5.0

    def test_lower_only_ge(self):
        rr = parse_reference_range(">= 1.0")
        assert rr.low == 1.0
        assert rr.high is None

    def test_lower_only_unicode(self):
        rr = parse_reference_range("\u22651.0")
        assert rr.low == 1.0
        assert rr.high is None

    def test_lower_only_gt(self):
        rr = parse_reference_range("> 1.0")
        assert rr.low == 1.0
        assert rr.high is None

    def test_multi_population_takes_first(self):
        rr = parse_reference_range("Adult: 3.5-5.1; Child: 3.0-4.5")
        assert rr.low == 3.5
        assert rr.high == 5.1

    def test_qualitative_negative(self):
        rr = parse_reference_range("Negative")
        assert rr.low is None
        assert rr.high is None

    def test_qualitative_non_reactive(self):
        rr = parse_reference_range("Non-reactive")
        assert rr.low is None
        assert rr.high is None

    def test_empty_string(self):
        rr = parse_reference_range("")
        assert rr.low is None
        assert rr.high is None
        assert rr.raw_text == ""

    def test_raw_text_preserved(self):
        raw = "3.5 - 5.1 mmol/L"
        rr = parse_reference_range(raw)
        assert rr.raw_text == raw

    def test_integer_range(self):
        rr = parse_reference_range("4 - 11")
        assert rr.low == 4.0
        assert rr.high == 11.0

    def test_decimal_range(self):
        rr = parse_reference_range("0.50 - 1.20")
        assert rr.low == 0.50
        assert rr.high == 1.20
