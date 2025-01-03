import re

src = open("jvgeo.js").read()

# Remove lines not starting by '///'
src = re.sub(r"^(?!\s*?///).*?$\n?", r"", src, 0, re.MULTILINE)
# Remove '///' at the beginning of every lines
src = re.sub(r"^\s*?/// ?", r"", src, 0, re.MULTILINE)

open("USAGE.md", "w").write(src)