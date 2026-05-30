#!/usr/bin/env python3
"""
Split combined `symbols_full.json` (one skeleton with all symbols + animations)
into per-symbol skeletons that share the same atlas/png. Mirrors the existing
per-symbol architecture (`H1.json`, `Special_1.json`, etc.) so each ReelSymbol
loads only the bones/slots/animations it actually needs.

Designer hands off `designer_assets/Symbols/export/symbols.json`. This script
runs once per art update; the generated JSONs commit alongside the atlas/png.
"""
from __future__ import annotations

import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
APP_ROOT = SCRIPT_DIR.parent
SPINE_DIR = APP_ROOT / "static/assets/spines/symbolsNew"
SOURCE = SPINE_DIR / "symbols_full.json"


def load_combined() -> dict:
    with SOURCE.open("r", encoding="utf-8") as f:
        return json.load(f)


def make_skeleton(width: int = 196, height: int = 196) -> dict:
    return {
        "hash": "split",
        "spine": "4.2.43",
        "images": "./images/",
        "audio": "./audio",
        "x": -width // 2,
        "y": -height // 2,
        "width": width,
        "height": height,
    }


def filter_attachments(skin_attachments: dict, slot_names: set[str]) -> dict:
    return {name: attachments for name, attachments in skin_attachments.items() if name in slot_names}


def _is_int(value) -> bool:
    return isinstance(value, int) or (isinstance(value, float) and value.is_integer())


def remap_mesh_vertices(vertices: list, uvs: list, bone_remap: dict[int, int]) -> list:
    """Remap bone indices in a Spine mesh vertex stream.

    Mesh vertices come in two flavors:
      * Plain positions: `[x, y, x, y, ...]` — length == uvs.length.
      * Weighted: `[boneCount, boneIdx, x, y, w, boneIdx, x, y, w, ...]`
        per vertex; the bone indices reference the parent skeleton's
        bones array. After we drop bones from a skeleton those indices
        shift, so we walk the stream and rewrite each `boneIdx` to
        `bone_remap[boneIdx]`. Missing remap entries crash loudly so we
        notice immediately instead of producing a runtime "Cannot read
        properties of undefined (reading 'a')" deep inside pixi-spine.
    """
    num_uvs = len(uvs)
    if len(vertices) == num_uvs:
        return list(vertices)

    new_vertices: list = []
    i = 0
    while i < len(vertices):
        bone_count_raw = vertices[i]
        if not _is_int(bone_count_raw):
            raise ValueError(
                f"Expected bone count int at vertex stream offset {i}, got {bone_count_raw!r}",
            )
        bone_count = int(bone_count_raw)
        new_vertices.append(bone_count)
        i += 1
        for _ in range(bone_count):
            old_bone_idx_raw = vertices[i]
            if not _is_int(old_bone_idx_raw):
                raise ValueError(
                    f"Expected bone index int at vertex stream offset {i}, got {old_bone_idx_raw!r}",
                )
            old_bone_idx = int(old_bone_idx_raw)
            if old_bone_idx not in bone_remap:
                raise KeyError(
                    f"Mesh references bone index {old_bone_idx} which was filtered out; "
                    f"include the originating bone in the per-symbol bone list",
                )
            new_vertices.extend(
                [
                    bone_remap[old_bone_idx],
                    vertices[i + 1],
                    vertices[i + 2],
                    vertices[i + 3],
                ]
            )
            i += 4
    return new_vertices


def remap_attachments(attachments: dict, bone_remap: dict[int, int]) -> dict:
    """Walk a skin's attachment dict and rewrite mesh bone indices in-place."""
    out: dict = {}
    for slot_name, slot_attachments in attachments.items():
        out_slot: dict = {}
        for attachment_name, attachment in slot_attachments.items():
            if attachment.get("type") == "mesh" and "vertices" in attachment and "uvs" in attachment:
                rewired = dict(attachment)
                rewired["vertices"] = remap_mesh_vertices(
                    attachment["vertices"], attachment["uvs"], bone_remap
                )
                out_slot[attachment_name] = rewired
            else:
                out_slot[attachment_name] = attachment
        out[slot_name] = out_slot
    return out


def filter_animation(animation: dict, bone_names: set[str], slot_names: set[str]) -> dict:
    """Strip animation timelines that reference bones/slots not in this symbol.

    The combined skeleton's animations (e.g. `Mystery/explosion`) sometimes
    reference bones/slots from other symbols that were kept by the designer
    in the same clip but that we filter out per-symbol. Spine's
    `SkeletonJson.readAnimation` looks up every referenced bone/slot by
    name and throws "Bone not found: L" / "Slot not found: ..." when a
    timeline points at something we removed — that exception is swallowed
    by `AssetsLoader.svelte`'s `try/catch`, so the asset never makes it
    into `loadedAssets` and `SpineProvider` crashes later with
    `Cannot read properties of undefined (reading 'skeletonData')`.
    """
    filtered: dict = {}
    for section, payload in animation.items():
        if section == "bones":
            kept = {name: timeline for name, timeline in payload.items() if name in bone_names}
            if kept:
                filtered[section] = kept
        elif section == "slots":
            kept = {name: timeline for name, timeline in payload.items() if name in slot_names}
            if kept:
                filtered[section] = kept
        elif section == "ik" or section == "transform" or section == "path":
            # Constraint timelines reference constraint names; combined skeleton
            # has no constraints today, but if they're added we keep them all
            # since the per-symbol skeletons inherit the same constraint names.
            filtered[section] = payload
        elif section == "deform":
            # Deform timelines are nested as skin -> slot -> attachment. Keep
            # only the slots we actually have to avoid dangling references.
            kept_skins: dict = {}
            for skin_name, slot_map in payload.items():
                kept_slots = {
                    slot: deform for slot, deform in slot_map.items() if slot in slot_names
                }
                if kept_slots:
                    kept_skins[skin_name] = kept_slots
            if kept_skins:
                filtered[section] = kept_skins
        elif section == "drawOrder" or section == "events":
            filtered[section] = payload
        else:
            filtered[section] = payload
    return filtered


def build_skeleton(
    *,
    combined: dict,
    bone_names: list[str],
    slot_names: list[str],
    animation_names: list[str],
    skeleton_overrides: dict | None = None,
    extra_animations: dict | None = None,
) -> dict:
    # Bones in the per-symbol JSON are emitted in the order they appear in
    # the combined skeleton — keeps parents before children (Spine requires
    # parents to load first) and gives us a deterministic mapping from the
    # combined-file bone index to the new file's bone index.
    bones: list[dict] = []
    bone_remap: dict[int, int] = {}
    for old_idx, bone in enumerate(combined["bones"]):
        if bone["name"] in bone_names:
            bone_remap[old_idx] = len(bones)
            bones.append(bone)

    missing_bones = set(bone_names) - {b["name"] for b in bones}
    if missing_bones:
        raise KeyError(f"Bones not present in combined skeleton: {sorted(missing_bones)}")

    slots = [s for s in combined["slots"] if s["name"] in slot_names]

    skin_default = next(s for s in combined["skins"] if s["name"] == "default")
    attachments = filter_attachments(skin_default["attachments"], set(slot_names))
    # Mesh attachments embed bone indices in their `vertices` weight stream.
    # Filtering bones renumbers everything, so rewrite those indices here —
    # otherwise pixi-spine crashes with "Cannot read properties of
    # undefined (reading 'a')" when applying skinned vertex weights to a
    # bone that no longer exists at the original index.
    attachments = remap_attachments(attachments, bone_remap)

    bone_name_set = set(bone_names)
    slot_name_set = set(slot_names)
    animations = {
        name: filter_animation(combined["animations"][name], bone_name_set, slot_name_set)
        for name in animation_names
        if name in combined["animations"]
    }
    if extra_animations:
        # Synthesised clips (e.g. `Special_1/idle`) keep the spine in its rest
        # pose with the right slot attachments visible — used for static/spin
        # states so the kitty's paw + whiskers render via the same skeleton
        # the wave/win animations use, eliminating the visual gap when
        # transitioning between sprite and spine.
        animations.update(extra_animations)

    skeleton = make_skeleton()
    if skeleton_overrides:
        skeleton.update(skeleton_overrides)

    return {
        "skeleton": skeleton,
        "bones": bones,
        "slots": slots,
        "skins": [{"name": "default", "attachments": attachments}],
        "animations": animations,
    }


def basic_symbol(combined: dict, name: str, animation: str) -> dict:
    """High_X / Low_X — single slot on `scale` bone, single bounce animation."""
    return build_skeleton(
        combined=combined,
        bone_names=["root", "scale"],
        slot_names=[name],
        animation_names=[animation],
    )


def make_idle_animation(slot_attachment_pairs: list[tuple[str, str]]) -> dict:
    """Synthesise a zero-movement clip that just pins slot attachments visible.

    pixi-svelte's `SpineTrack` always calls `setAnimation`, so we can't
    "leave a spine paused at setup pose without an animation". Instead, we
    feed it this clip — only attachment timelines, no bone movement — so
    the skeleton renders in its rest pose with the right images on the
    right slots and stays that way until another track plays.
    """
    return {
        "slots": {
            slot: {"attachment": [{"name": attachment_name}]}
            for slot, attachment_name in slot_attachment_pairs
        }
    }


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
    print(f"  wrote {path.relative_to(APP_ROOT)}")


def main() -> None:
    combined = load_combined()

    # H1..H4, L1..L4 — bounce-only single-slot skeletons.
    simple_symbols = {
        "High_1": "High_1/bounce",
        "High_2": "High_2/bounce",
        "High_3": "High_3/bounce",
        "High_4": "High_4/bounce",
        "Low_1": "Low_1/bounce",
        "Low_2": "Low_2/bounce",
        "Low_3": "Low_3/bounce",
        "Low_4": "Low_4/bounce",
    }
    for slot, anim in simple_symbols.items():
        write_json(SPINE_DIR / f"{slot}.json", basic_symbol(combined, slot, anim))

    # Special_1 (Bonus) land/idle: kitty body + animatable paw + ears +
    # whiskers ONLY. Text letters live in the win-only skeleton so the
    # default skin never accidentally renders BONUS text during landing.
    # Animation set: bounce (parent-bone squash), wave (paw wave on land),
    # idle (synthetic, pins attachments visible so paw+whiskers stay
    # rendered in static/spin states without any motion).
    special_1_land_bones = [
        "root", "scale", "Special_1", "Paw", "Paw3", "Paw2", "Paw4",
        "Head", "EarL", "EarR", "whisker1", "whisker2",
    ]
    special_1_land_slots = ["Special_1", "Paw", "wiskars", "wiskars2"]
    special_1_idle = make_idle_animation([
        ("Special_1", "Special_1"),
        ("Paw", "Paw"),
        ("wiskars", "wiskars"),
        ("wiskars2", "wiskars"),
    ])
    write_json(
        SPINE_DIR / "Special_1.json",
        build_skeleton(
            combined=combined,
            bone_names=special_1_land_bones,
            slot_names=special_1_land_slots,
            animation_names=["Special_1/bounce", "Special_1/wave"],
            extra_animations={"Special_1/idle": special_1_idle},
        ),
    )

    # Special_1 (Bonus) win celebration — kitty + paw + every B/O/N/U/S
    # letter + Text_bonus container. Win animation explicitly fades letters
    # in/out via rgba timelines, so default skin visibility is fine here.
    special_1_win_bones = special_1_land_bones + [
        "Text_bonus", "B", "O", "N", "U", "S",
    ]
    special_1_win_slots = special_1_land_slots + [
        "B", "O", "N", "S", "U",
        "B2", "O2", "N2", "S2", "U2",
    ]
    write_json(
        SPINE_DIR / "Special_1_win.json",
        build_skeleton(
            combined=combined,
            bone_names=special_1_win_bones,
            slot_names=special_1_win_slots,
            animation_names=["Special_1/win"],
        ),
    )

    # Special_2 (Wild) land/idle: just the W tile, no W/I/L/D text. Idle
    # clip mirrors Bonus — keeps the W tile rendered for static/spin via
    # the same spine that runs bounce on land.
    special_2_land_bones = ["root", "scale", "Special_2"]
    special_2_land_slots = ["Special_2"]
    special_2_idle = make_idle_animation([("Special_2", "Special_2")])
    write_json(
        SPINE_DIR / "Special_2.json",
        build_skeleton(
            combined=combined,
            bone_names=special_2_land_bones,
            slot_names=special_2_land_slots,
            animation_names=["Special_2/bounce"],
            extra_animations={"Special_2/idle": special_2_idle},
        ),
    )

    # Special_2 (Wild) win — W tile + W/I/L/D letters + Text_wild container.
    special_2_win_bones = special_2_land_bones + [
        "Text_wild", "W", "I", "L", "D",
    ]
    special_2_win_slots = special_2_land_slots + [
        "W", "I", "L", "D", "W2", "I2", "L2", "D2",
    ]
    write_json(
        SPINE_DIR / "Special_2_win.json",
        build_skeleton(
            combined=combined,
            bone_names=special_2_win_bones,
            slot_names=special_2_win_slots,
            animation_names=["Special_2/win"],
        ),
    )

    # Mystery: full reveal explosion sequence with sign + parts + glow + particles.
    # `Mystery/idle` is a synthetic zero-movement clip that only sets
    # Mystery_bg + Mystery_sign + Sign_glow attachments — used for the
    # static state so the dark hexagonal frame and `?` glyph render via
    # the same skeleton the explosion uses, eliminating a sprite/spine
    # transition flash and giving the symbol its proper background.
    mystery_bones = [
        "root", "scale", "Mystery", "Mystery_sign",
        "Mystery_p1", "Mystery_p2", "Mystery_p3", "Mystery_p4", "Mystery_p5",
        "Mystery_part", "Mystery_part2", "Mystery_part3",
        "Effects", "Particles",
    ]
    mystery_slots = [
        "Mystery_bg", "Mystery_sign",
        "Mystery_p1", "Mystery_p2", "Mystery_p3", "Mystery_p4", "Mystery_p5",
        "Mystery_part", "Mystery_part2", "Mystery_part3",
        "Aura", "Aura2", "Sign_glow", "Particles",
    ]
    mystery_idle = make_idle_animation([
        ("Mystery_bg", "Mystery_bg"),
        ("Mystery_sign", "Mystery_sign"),
    ])
    write_json(
        SPINE_DIR / "Mystery.json",
        build_skeleton(
            combined=combined,
            bone_names=mystery_bones,
            slot_names=mystery_slots,
            animation_names=["Mystery/explosion"],
            extra_animations={"Mystery/idle": mystery_idle},
            skeleton_overrides={"width": 256, "height": 256, "x": -128, "y": -128},
        ),
    )

    print("done.")


if __name__ == "__main__":
    main()
