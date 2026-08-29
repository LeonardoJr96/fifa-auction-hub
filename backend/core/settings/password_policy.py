"""Política de senha — espelhada na API e no frontend."""

PASSWORD_POLICY = {
    "min_length": 8,
    "max_length": 32,
    "character_requirements": {
        "enabled": True,
        "min_upper": 1,
        "min_digit": 1,
        "min_special": 1,
        "special_characters": "~!@#$%^&*()_+{}\"':;[]",
    },
}
