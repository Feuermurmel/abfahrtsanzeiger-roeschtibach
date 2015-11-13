SRC_FILES := $(shell find src -not \( \( -name '.*' -or -name '* *' \) -prune \) -type f)
select = $(patsubst src/$1,out/$2,$(filter src/$1,$(SRC_FILES)))

COMPILED_CSS_FILES := $(call select,%.less,%.css)
COPIED_FILES := $(call select,%,%)

.PHONY: clean all

all: $(COMPILED_CSS_FILES) $(COPIED_FILES)

clean:
	rm -rf out deploy

$(COMPILED_CSS_FILES): out/%.css: out/%.less
	lessc --source-map $< $@

$(COPIED_FILES): out/%: src/%
	@ mkdir -p $(@D)
	cp $< $@
