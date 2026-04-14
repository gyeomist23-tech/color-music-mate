"""oemer numpy/sklearn 호환성 패치"""
import site, os

sp = site.getsitepackages()[0]
oemer_dir = os.path.join(sp, "oemer")

patches = {
    "staffline_extraction.py": [
        ("dtype=np.int)", "dtype=int)"),
    ],
    "symbol_extraction.py": [
        ("np.int(unit_size//2)", "int(unit_size//2)"),
    ],
    "bbox.py": [],  # AgglomerativeClustering 패치
}

for fname, replacements in patches.items():
    fpath = os.path.join(oemer_dir, fname)
    if not os.path.exists(fpath):
        print(f"Skip (not found): {fpath}")
        continue
    txt = open(fpath).read()
    for old, new in replacements:
        txt = txt.replace(old, new)
    if fname == "bbox.py":
        old = "    model = AgglomerativeClustering("
        new = "    if len(bboxes) <= 1:\n        return list(bboxes)\n    model = AgglomerativeClustering("
        txt = txt.replace(old, new, 1)
    open(fpath, "w").write(txt)
    print(f"Patched: {fname}")

print("패치 완료")
