import json
import os
from collections import defaultdict

with open(r'c:\Users\italo\OneDrive\Documentos\catologo-project\coverage\coverage-final.json') as f:
    coverage = json.load(f)

# Analyze all files
all_files = {}
for filepath, data in coverage.items():
    name = os.path.basename(filepath)
    statements = data.get('s', {})
    total = len(statements)
    if total == 0:
        continue
    covered = sum(1 for v in statements.values() if v > 0)
    pct = covered / total * 100
    
    # Determine category and frequency weight
    weight = 0
    if 'services' in filepath.lower():
        weight = 10  # Services are frequently used
    elif 'hooks' in filepath.lower():
        weight = 9   # Custom hooks
    elif 'lib' in filepath.lower():
        weight = 8   # Libraries
    elif 'page.tsx' in name:
        weight = 7   # Pages
    elif 'forms' in filepath.lower():
        weight = 6   # Forms are critical user interaction
    elif 'components' in filepath.lower():
        weight = 5
    elif 'api.ts' in name:
        weight = 10  # API layer critical
    
    all_files[filepath] = {
        'name': name,
        'pct': pct,
        'covered': covered,
        'total': total,
        'weight': weight
    }

# Find critical files with low coverage
critical = []
for path, info in all_files.items():
    if info['pct'] == 0 and info['weight'] > 0:
        # Impact score = lines * usage weight
        impact = info['total'] * info['weight']
        critical.append((info['name'], info['pct'], info['total'], impact, path))

critical.sort(key=lambda x: x[3], reverse=True)

print('TOP 10 CRITICAL FILES (0% coverage, sorted by impact):')
print('=' * 70)
for i, (name, pct, lines, impact, path) in enumerate(critical[:10], 1):
    print(f'{i:2}. {name:30} {lines:4} lines (impact: {impact:5})')
    
print('\n' + '='*70)
print('\nAdditional analysis:')

# Find all services with 0%
services_0pct = [(f, info['total']) for f, info in all_files.items() 
                 if 'services' in f.lower() and 'test' not in f.lower() and info['pct'] == 0]
print(f'\nServices with 0%: {len(services_0pct)}')
for path, lines in services_0pct:
    print(f'  - {os.path.basename(path)} ({lines} lines)')

# Check api.ts
api_files = [(f, info) for f, info in all_files.items() if 'api.ts' in f]
print(f'\nAPI files coverage:')
for path, info in api_files:
    print(f'  - {os.path.basename(path)}: {info["pct"]:.1f}% ({info["covered"]}/{info["total"]} lines)')

# Check libs
lib_files = [(f, info) for f, info in all_files.items() if 'lib' in f and 'test' not in f]
print(f'\nLib files coverage:')
for path, info in sorted(lib_files):
    name = os.path.basename(path)
    print(f'  - {name}: {info["pct"]:.1f}% ({info["covered"]}/{info["total"]} lines)')

print('\n\nDASHBOARD PAGES coverage:')
dashboard_files = [(f, info) for f, info in all_files.items() if 'dashboard' in f.lower()]
for path, info in sorted(dashboard_files):
    if 'page.tsx' in path:
        name = os.path.basename(os.path.dirname(path))
        print(f'  - {name:30} {info["pct"]:6.1f}% ({info["covered"]}/{info["total"]} lines)')

print('\nFORM COMPONENTS coverage:')
form_files = [(f, info) for f, info in all_files.items() if 'forms' in f.lower()]
for path, info in sorted(form_files):
    name = os.path.basename(path)
    print(f'  - {name:30} {info["pct"]:6.1f}% ({info["covered"]}/{info["total"]} lines)')
