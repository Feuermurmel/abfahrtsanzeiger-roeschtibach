SRC_FILES := $(shell find src -not \( \( -name '.*' -or -name '* *' \) -prune \) -type f)
select = $(patsubst src/$1,out/$2,$(filter src/$1,$(SRC_FILES)))

COMPILED_CSS_FILES := $(call select,%.less,%.css)
COPIED_FILES := $(call select,%,%)

.PHONY: all clean

all: $(COMPILED_CSS_FILES) $(COPIED_FILES) node_modules/.sentinel

node_modules/.sentinel: package.json
	rm -rf $(@D)
	npm install
	touch $@

clean:
	rm -rf out

$(COMPILED_CSS_FILES): out/%.css: out/%.less node_modules/.sentinel
	npm run lessc --source-map $< $@

$(COPIED_FILES): out/%: src/%
	@ mkdir -p $(@D)
	cp $< $@
