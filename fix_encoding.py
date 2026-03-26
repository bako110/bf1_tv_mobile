#!/usr/bin/env python3
import os
import glob

# UTF-8 mojibake mappings
replacements = {
    'Ã©': 'é',
    'Ã ': 'à',
    'Ã¢': 'â',
    'Ã§': 'ç',
    'Ã¨': 'è',
    'Ã‰': 'É',
    'Ã«': 'ë',
    'Ã®': 'î',
    'Ã¯': 'ï',
    'Ã¼': 'ü',
    'Ã¶': 'ö',
    'Â·': '·',
    'â€': '–',
    'â€™': ''',
    'â€œ': '"',
    'â€¢': '•',
    'dâ€™': 'd'',
    'â€"': '–',
    'â€˜': ''',
    'ðŸš€': '🚀',
    'ðŸ"¥': '📥',
    'ðŸ"¡': '📡',
    'âœ…': '✅',
    'âŒ': '❌',
    'â³': '⏳',
    'âš ': '⚠',
    'ðŸ"„': '📱',
}

fixed_count = 0
pages_dir = 'web/pages'

for filepath in glob.glob(os.path.join(pages_dir, '*.html')):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    orig_content = content
    for corrupt, correct in replacements.items():
        content = content.replace(corrupt, correct)
    
    if content != orig_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Fixed: {os.path.basename(filepath)}")
        fixed_count += 1

print(f"\n🎉 Total files fixed: {fixed_count}")
