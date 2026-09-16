import random

from douzero.env.env import deck
from douzero.env.move_generator import MovesGener

from phantom.game import classify_move


def test_common_chinese_dou_dizhu_patterns_are_named_correctly() -> None:
    cases = {
        (): "不出",
        (3,): "单张",
        (3, 3): "对子",
        (3, 3, 3): "三张",
        (3, 3, 3, 4): "三带一",
        (3, 3, 3, 4, 4): "三带二",
        (3, 4, 5, 6, 7): "顺子",
        (3, 3, 4, 4, 5, 5): "连对",
        (3, 3, 3, 4, 4, 4): "飞机不带翅膀",
        (3, 3, 3, 4, 4, 4, 6, 7): "飞机带单张",
        (3, 3, 3, 4, 4, 4, 6, 6, 7, 7): "飞机带对子",
        (3, 3, 3, 3, 4, 5): "四带二",
        (3, 3, 3, 3, 4, 4, 5, 5): "四带两对",
        (3, 3, 3, 3): "炸弹",
        (20, 30): "王炸",
    }
    for cards, expected in cases.items():
        assert classify_move(cards).label == expected


def test_invalid_near_misses_are_not_presented_as_legal_patterns() -> None:
    for cards in (
        (3, 4, 5, 6),  # a straight needs at least five cards
        (3, 3, 3, 3, 4),  # four plus one is not three-with-a-pair
        (10, 11, 12, 13, 14, 17),  # 2 cannot enter a straight
        (3, 3, 4, 4),  # a pair sequence needs at least three pairs
    ):
        assert classify_move(cards).valid is False


def test_douzero_generator_includes_three_with_one_and_three_with_pair() -> None:
    moves = MovesGener([3, 3, 3, 4, 4, 5]).gen_moves()

    canonical_moves = [sorted(move) for move in moves]
    assert [3, 3, 3, 5] in canonical_moves
    assert [3, 3, 3, 4, 4] in canonical_moves


def test_every_generated_move_has_a_valid_chinese_pattern_name() -> None:
    rng = random.Random(20260912)
    for _ in range(40):
        hand = rng.sample(deck, 20)
        assert all(classify_move(move).valid for move in MovesGener(hand).gen_moves())
