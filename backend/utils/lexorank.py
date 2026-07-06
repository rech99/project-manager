def get_midpoint(char1: str, char2: str) -> str:
    """Finds the character between char1 and char2."""
    code1 = ord(char1)
    code2 = ord(char2)
    return chr((code1 + code2) // 2)

def lexorank_between(prev_rank: str = None, next_rank: str = None) -> str:
    """
    Generates a lexicographical rank string between prev_rank and next_rank.
    Uses lower-case ASCII chars 'a' to 'z' (codes 97 to 122).
    """
    MIN_CHAR = 'a'
    MAX_CHAR = 'z'
    MID_CHAR = 'n'
    
    # 1. No items exist in the column
    if not prev_rank and not next_rank:
        return MID_CHAR

    # 2. Inserting at the very beginning
    if not prev_rank:
        # Try to find a midpoint between 'a' and next_rank
        # If next_rank is 'a', we must prepend 'a' and append a midpoint (e.g., 'an' is between 'a' and 'b')
        next_val = next_rank
        # Pad with 'a' if next_val is empty, but it shouldn't be
        if not next_val:
            return MIN_CHAR
        
        # If the first character of next_val is greater than 'a', we find midpoint between 'a' and that char
        if next_val[0] > MIN_CHAR:
            return get_midpoint(MIN_CHAR, next_val[0])
        else:
            # If it starts with 'a', we need to check the rest of the string
            # e.g., next_val = 'am'. Midpoint between 'a' and 'am' is 'ag'.
            # We construct a new string by keeping 'a' and finding midpoint for the next position
            result = [MIN_CHAR]
            i = 1
            while i < len(next_val):
                if next_val[i] > MIN_CHAR:
                    result.append(get_midpoint(MIN_CHAR, next_val[i]))
                    return "".join(result)
                result.append(MIN_CHAR)
                i += 1
            # If we reached the end (e.g. next_val is 'a'), we append 'm'
            result.append(MID_CHAR)
            return "".join(result)

    # 3. Inserting at the very end
    if not next_rank:
        prev_val = prev_rank
        # If the last character is less than 'z', we just increment it to the midpoint with 'z'
        # e.g., if prev_val is 'm', midpoint with 'z' is 't'
        last_char = prev_val[-1]
        if last_char < MAX_CHAR:
            return prev_val[:-1] + get_midpoint(last_char, MAX_CHAR)
        else:
            # If it's already 'z', we append 'm' (midpoint) to make it larger
            # e.g., 'z' -> 'zm'
            return prev_val + MID_CHAR

    # 4. Inserting between two existing ranks
    prev_val = prev_rank
    next_val = next_rank

    # We need to find the first character where they differ
    len_p = len(prev_val)
    len_n = len(next_val)
    max_len = max(len_p, len_n)
    
    # Pad strings to equal length with 'a' for comparison, but keep original for building result
    padded_p = prev_val.ljust(max_len, MIN_CHAR)
    padded_n = next_val.ljust(max_len, MIN_CHAR)

    i = 0
    while i < max_len:
        if padded_p[i] != padded_n[i]:
            break
        i += 1

    # If they are identical (should not happen if ranks are unique), we append a char
    if i == max_len:
        return prev_val + MID_CHAR

    # If the difference is at index i
    char_p = padded_p[i]
    char_n = padded_n[i]

    # If there is space between them (e.g. 'c' and 'e' -> 'd')
    if ord(char_n) - ord(char_p) > 1:
        mid = get_midpoint(char_p, char_n)
        return prev_val[:i] + mid
    else:
        # No space directly between them (e.g. 'c' and 'd')
        # We need to look at the next characters
        # e.g. midpoint between 'c' and 'd' -> 'cm' (since 'cm' is lexicographically between 'c' and 'd')
        # We start with the prefix up to index i and 'c', then append midpoint for remaining parts
        result = prev_val[:i] + char_p
        
        # Check next chars of prev_val
        rest_p = prev_val[i+1:]
        if not rest_p:
            # If prev_val ended, we just append 'n' (midpoint between 'a' and 'z')
            return result + MID_CHAR
        else:
            # If there are characters left in prev_val, we want a string larger than rest_p but smaller than next_val
            # A simple way is to increment the last char of rest_p or append a middle char
            # We can find midpoint between rest_p and 'z'
            return result + lexorank_between(rest_p, None)
