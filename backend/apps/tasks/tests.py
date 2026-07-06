from django.test import TestCase
from utils.lexorank import lexorank_between

class LexorankTestCase(TestCase):
    def test_lexorank_midpoint_simple(self):
        # Empty list -> 'n'
        self.assertEqual(lexorank_between(None, None), 'n')
        
        # Inserting at beginning of a single item 'n' -> 'g'
        self.assertEqual(lexorank_between(None, 'n'), 'g')
        
        # Inserting at end of a single item 'n' -> 't'
        self.assertEqual(lexorank_between('n', None), 't')
        
        # Inserting between 'g' and 'n' -> 'j'
        self.assertEqual(lexorank_between('g', 'n'), 'j')
        
        # Adjacent characters -> appends midpoint
        # Between 'c' and 'd' -> should start with 'c' and be greater than 'c' (e.g. 'cn')
        rank = lexorank_between('c', 'd')
        self.assertTrue(rank.startswith('c'))
        self.assertTrue('c' < rank < 'd')
        
        # Prepending/extension checks
        # Between 'a' and 'am' -> 'ag'
        rank2 = lexorank_between(None, 'am')
        self.assertTrue('a' < rank2 < 'am')
