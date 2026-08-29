from .autogen import auto_generate_fixtures, can_auto_generate
from .cup import generate_cup_bracket
from .draft import build_pick_order, get_draft_state, make_pick, start_draft

from .draft_order import set_draft_order
from .legacy import (
    finish_competition,
    generate_bracket,
    register_manual_result,
    simulate_match,
)
from .league import generate_league_fixtures, get_standings
from .matches import (
    get_competition_matches,
    register_competition_match_result,
    simulate_competition_match,
)
from .registration import activate_without_draft, create_competition, join_competition

__all__ = [
    "activate_without_draft",
    "auto_generate_fixtures",
    "can_auto_generate",

    "build_pick_order",
    "create_competition",
    "finish_competition",
    "generate_bracket",
    "generate_cup_bracket",
    "generate_league_fixtures",
    "get_competition_matches",
    "get_draft_state",
    "get_standings",
    "join_competition",
    "make_pick",
    "register_competition_match_result",
    "register_manual_result",
    "set_draft_order",
    "simulate_competition_match",
    "simulate_match",
    "start_draft",
]
