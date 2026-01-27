import nltk
from nltk.corpus import wordnet as wn
from nltk.corpus import brown
from collections import Counter
import json
import re

for pkg in ["wordnet", "brown", "averaged_perceptron_tagger", "universal_tagset"]:
    try:
        nltk.data.find(f"corpora/{pkg}")
    except LookupError:
        nltk.download(pkg)

ALLOWED_LEXNAMES = {
    "noun.artifact",
    "noun.animal",
    "noun.food",
    "noun.plant",
    "noun.body",
    "noun.object",
    "noun.substance",
}

DEMONYM_RE = re.compile(r".*(ian|ese|ish)$")
BAD_CHARS_RE = re.compile(r"[_\-]")

def is_clean_word(w: str) -> bool:
    if not w.isalpha(): 
        return False
    if BAD_CHARS_RE.search(w): 
        return False
    if len(w) < 3 or len(w) > 12:
        return False
    if DEMONYM_RE.match(w):
        return False
    return True

def generate_dataset(
    total=25000,
    easy_n=15000,
    medium_n=5000
):
    hard_n = total - easy_n - medium_n

    print("Building frequency table (Brown)...")
    freq = Counter(w.lower() for w in brown.words())

    print("Harvesting from WordNet (lexname filtered)...")
    candidates = set()

    for syn in wn.all_synsets():
        try:
            if syn.lexname() not in ALLOWED_LEXNAMES:
                continue
            for lemma in syn.lemmas():
                w = lemma.name().lower()
                if is_clean_word(w):
                    candidates.add(w)
        except:
            continue

    clean = []
    for w in candidates:
        if freq[w] == 0 and len(w) > 6:
            continue
        clean.append(w)

    scored = []
    for w in clean:
        f = freq[w]
        score = (10000 / (f + 1)) + (len(w) * 2)
        scored.append((w, score))
    scored.sort(key=lambda x: x[1])
    wordnet_ranked = [w for w, _ in scored]

    print(f"WordNet usable words: {len(wordnet_ranked)}")

    if len(wordnet_ranked) < total:
        needed = total - len(wordnet_ranked)
        print(f"Filling {needed} more from Brown...")

        brown_words = set(w.lower() for w in brown.words())
        brown_fill = [w for w in brown_words if is_clean_word(w)]

        brown_fill.sort(key=lambda w: (-freq[w], len(w)))

        seen = set(wordnet_ranked)
        for w in brown_fill:
            if w in seen: 
                continue
            wordnet_ranked.append(w)
            seen.add(w)
            if len(wordnet_ranked) >= total:
                break

    final = wordnet_ranked[:total]

    dataset = {
        "easy": sorted(final[:easy_n]),
        "medium": sorted(final[easy_n:easy_n + medium_n]),
        "hard": sorted(final[easy_n + medium_n:easy_n + medium_n + hard_n]),
    }

    print("Counts:", {k: len(v) for k, v in dataset.items()}, "Total:", sum(len(v) for v in dataset.values()))

    with open("dataset.json", "w") as f:
        json.dump(dataset, f, indent=2)

    print("Done! dataset.json created.")

if __name__ == "__main__":
    generate_dataset()
