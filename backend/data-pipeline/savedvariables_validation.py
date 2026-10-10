"""Conservative preflight for the existing regex-based SavedVariables importer.

This is not a Lua interpreter. Reject incomplete structures and string constructs
the importer cannot safely delimit, retaining the original file for retry.
"""
import re


def validate_savedvariables_structure(content):
    stack = []
    in_string = False
    escaped = False
    saw_table = False
    for char in content:
        if in_string:
            if escaped:
                if char == '"':
                    raise ValueError("Escaped quotes are not supported by the SavedVariables importer")
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            elif char in "{}":
                raise ValueError("Braces in strings are not supported by the SavedVariables importer")
            elif char in "\r\n":
                raise ValueError("Unterminated SavedVariables string")
            continue
        if char == '"':
            in_string = True
        elif char in "{[":
            stack.append(char)
            saw_table = saw_table or char == "{"
        elif char in "}]":
            expected = "{" if char == "}" else "["
            if not stack or stack.pop() != expected:
                raise ValueError("Unbalanced SavedVariables delimiters")
    if stack or in_string or not saw_table:
        raise ValueError("Incomplete SavedVariables table")
    for field in ("Scans", "Purchases", "Gear", "TraitResearch"):
        key = f'["{field}"]'
        if key in content and not re.search(re.escape(key) + r'\s*=\s*\{', content):
            raise ValueError(f"SavedVariables {field} must be a table")
