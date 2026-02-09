"""Tests for unit normalization and conversion."""

from labx.domain.units import convert_value, normalize_unit


class TestNormalizeUnit:
    def test_lowercase_to_canonical(self):
        assert normalize_unit("mmol/l") == "mmol/L"
        assert normalize_unit("mg/dl") == "mg/dL"
        assert normalize_unit("g/dl") == "g/dL"

    def test_unicode_micro(self):
        assert normalize_unit("µmol/l") == "umol/L"
        assert normalize_unit("µg/ml") == "ug/mL"

    def test_cell_counts(self):
        assert normalize_unit("x10^9/l") == "x10^9/L"
        assert normalize_unit("10^12/l") == "x10^12/L"
        assert normalize_unit("x10e9/l") == "x10^9/L"

    def test_percent(self):
        assert normalize_unit("%") == "%"
        assert normalize_unit("percent") == "%"

    def test_time(self):
        assert normalize_unit("sec") == "s"
        assert normalize_unit("seconds") == "s"

    def test_passthrough(self):
        # Unknown units pass through stripped
        assert normalize_unit("  some_weird_unit  ") == "some_weird_unit"

    def test_fl(self):
        assert normalize_unit("fl") == "fL"

    def test_mm_hr(self):
        assert normalize_unit("mm/h") == "mm/hr"
        assert normalize_unit("mm/hr") == "mm/hr"


class TestConvertValue:
    def test_same_unit(self):
        assert convert_value(5.0, "mmol/L", "mmol/L") == 5.0

    def test_g_dl_to_g_l(self):
        result = convert_value(1.0, "g/dL", "g/L")
        assert result is not None
        assert abs(result - 10.0) < 0.001

    def test_g_l_to_g_dl(self):
        result = convert_value(10.0, "g/L", "g/dL")
        assert result is not None
        assert abs(result - 1.0) < 0.001

    def test_mg_dl_to_mg_l(self):
        result = convert_value(5.0, "mg/dL", "mg/L")
        assert result is not None
        assert abs(result - 50.0) < 0.001

    def test_meq_to_mmol(self):
        result = convert_value(4.0, "mEq/L", "mmol/L")
        assert result is not None
        assert abs(result - 4.0) < 0.001

    def test_unknown_conversion(self):
        assert convert_value(5.0, "fL", "mg/dL") is None

    def test_normalized_lookup(self):
        # Input uses raw lowercase; converter should normalize first
        result = convert_value(1.0, "g/dl", "g/l")
        assert result is not None
        assert abs(result - 10.0) < 0.001
