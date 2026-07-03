"""
Regenerates assets/data/characters.js and assets/data/weapons.js from
Project Ambr (via the ambr-py wrapper), in the exact format the wish
tracker site expects.

This is meant to be run by the GitHub Actions workflow
(.github/workflows/update-data.yml) — not manually. If you ever do want
to run it locally: `pip install ambr-py` then `python scripts/update_data.py`.
"""

import asyncio
import json
import os

import ambr
                                                                             
ELEMENT_MAP = {
    "Wind": "Anemo",
    "Rock": "Geo",
    "Grass": "Dendro",
    "Electric": "Electro",
    "Fire": "Pyro",
    "Water": "Hydro",
    "Ice": "Cryo",
    "Anemo": "Anemo",
    "Geo": "Geo",
    "Dendro": "Dendro",
    "Electro": "Electro",
    "Pyro": "Pyro",
    "Hydro": "Hydro",
    "Cryo": "Cryo",
}

def normalize_element(raw):
    if not raw:
        return None
    return ELEMENT_MAP.get(raw, raw)

def js_value(value):
    return json.dumps(value, ensure_ascii=False)

CHARACTERS_JS_FOOTER = """
function getGenshinCharacter(name, rarity = 5) {
    return GENSHIN_CHARACTER_DB.find(c => c.rarity === rarity && c.name.toLowerCase() === name.toLowerCase()) || null;
}

function searchGenshinCharacters(query, rarity = 5) {
    const pool = GENSHIN_CHARACTER_DB.filter(c => c.rarity === rarity);
    if (!query) return pool.slice(0, 10);
    const lowerQuery = query.toLowerCase();
    return pool.filter(c => c.name.toLowerCase().includes(lowerQuery));
}

function makeCustomCharacter(name, rarity = 5) {
    return {
        name: name,
        rarity: rarity,
        element: null,
        icon: 'assets/data/custom_icons/Lumine_Placeholder_custom.webp',
        isCustom: true
    };
}
"""

WEAPONS_JS_FOOTER = """
function getGenshinWeapon(name, rarity = 5) {
    return GENSHIN_WEAPON_DB.find(w => w.rarity === rarity && w.name.toLowerCase() === name.toLowerCase()) || null;
}

function searchGenshinWeapons(query, rarity = 5) {
    const pool = GENSHIN_WEAPON_DB.filter(w => w.rarity === rarity);
    if (!query) return pool.slice(0, 10);
    const lowerQuery = query.toLowerCase();
    return pool.filter(w => w.name.toLowerCase().includes(lowerQuery));
}

function makeCustomWeapon(name, rarity = 5) {
    return {
        name: name,
        rarity: rarity,
        weaponType: null,
        icon: 'assets/data/custom_icons/Weapon_Dull_Blade_custom.webp',
        isCustom: true
    };
}
"""

def build_character_entry(c):
    return {
        "name": c.name,
        "rarity": c.rarity,
        "element": normalize_element(c.element.value if getattr(c, "element", None) else None),
        "icon": getattr(c, "icon", None),
        "isCustom": False,
    }

def build_weapon_entry(w):
    return {
        "name": w.name,
        "rarity": w.rarity,
        "weaponType": None,                                        
        "icon": getattr(w, "icon", None),
        "isCustom": False,
    }

def write_js_db(path, var_name, entries, footer):
    lines = [f"const {var_name} = ["]
    for i, e in enumerate(entries):
        comma = "," if i < len(entries) - 1 else ""
        entry_lines = ["  {"]
        keys = list(e.keys())
        for j, k in enumerate(keys):
            kcomma = "," if j < len(keys) - 1 else ""
            entry_lines.append(f'    "{k}": {js_value(e[k])}{kcomma}')
        entry_lines.append(f"  }}{comma}")
        lines.append("\n".join(entry_lines))
    lines.append("];")
    lines.append(footer)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

async def main():
    async with ambr.AmbrAPI() as client:
        print("Fetching data from Project Ambr...")
        characters = await client.fetch_characters()
        weapons = await client.fetch_weapons()
        print(f"Characters fetched: {len(characters)}")
        print(f"Weapons fetched: {len(weapons)}")

        char_entries = [build_character_entry(c) for c in characters]
        weapon_entries = [build_weapon_entry(w) for w in weapons]

        char_entries.sort(key=lambda e: e["name"].lower())
        weapon_entries.sort(key=lambda e: e["name"].lower())

        known_elements = set(ELEMENT_MAP.values())
        for e in char_entries:
            if e["element"] and e["element"] not in known_elements:
                print(f"  ! Unmapped element '{e['element']}' on {e['name']} — add it to ELEMENT_MAP")
            if not e["icon"]:
                print(f"  ! No icon found for {e['name']}")

        for e in weapon_entries:
            if not e["icon"]:
                print(f"  ! No icon found for {e['name']}")

        out_dir = os.path.join(os.getcwd(), "assets", "data")
        char_path = os.path.join(out_dir, "characters.js")
        weapon_path = os.path.join(out_dir, "weapons.js")

        write_js_db(char_path, "GENSHIN_CHARACTER_DB", char_entries, CHARACTERS_JS_FOOTER)
        write_js_db(weapon_path, "GENSHIN_WEAPON_DB", weapon_entries, WEAPONS_JS_FOOTER)

        print("Saved:")
        print(char_path)
        print(weapon_path)

if __name__ == "__main__":
    asyncio.run(main())
