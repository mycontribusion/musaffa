#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('src/components/PartnerSession.jsx', 'rb') as f:
    content = f.read()

# Find the bismillahEnd string
pattern = b"bismillahEnd = '"
idx = content.find(pattern)
if idx != -1:
    start = idx + len(pattern)
    end = content.find(b"'", start)
    string_bytes = content[start:end]
    string = string_bytes.decode('utf-8')
    print(f'PartnerSession bismillahEnd: "{string}"')
    for i, c in enumerate(string):
        print(f'  char {i}: U+{ord(c):04X} ({c})')

with open('src/components/MudarasaView.jsx', 'rb') as f:
    content = f.read()

pattern = b'bismillahEnd = "'
idx = content.find(pattern)
if idx != -1:
    start = idx + len(pattern)
    end = content.find(b'"', start)
    string_bytes = content[start:end]
    string = string_bytes.decode('utf-8')
    print(f'\nMudarasaView bismillahEnd: "{string}"')
    for i, c in enumerate(string):
        print(f'  char {i}: U+{ord(c):04X} ({c})')

with open('src/components/SurahDetail.jsx', 'rb') as f:
    content = f.read()

pattern = b'bismillahEnd = "'
idx = content.find(pattern)
if idx != -1:
    start = idx + len(pattern)
    end = content.find(b'"', start)
    string_bytes = content[start:end]
    string = string_bytes.decode('utf-8')
    print(f'\nSurahDetail bismillahEnd: "{string}"')
    for i, c in enumerate(string):
        print(f'  char {i}: U+{ord(c):04X} ({c})')
