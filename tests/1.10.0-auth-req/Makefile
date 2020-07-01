NGINX_VER := $(shell basename $$(readlink -e .) | sed 's/-.*$$//')
NGINX_CONFIGURE_OPTS := --add-module=$(shell readlink -e ../..) --with-debug \
                        --with-http_auth_request_module \
						--prefix=$(shell readlink -e .)/.build \
						--pid-path=$(shell readlink -e .)/.build/nginx.pid \
						--with-cc-opt=$(EXTRA_CFLAGS)

NGINX_SRC_FILE := nginx-$(NGINX_VER).tar.gz
NGINX_SRC_DIR  := nginx-$(NGINX_VER)
NGINX_SRC_URL  := http://nginx.org/download/$(NGINX_SRC_FILE)

FILES_DIR ?= $(shell readlink -e ..)/.files


.PHONY: all
all: .build/nginx
	# Test the configuration
	$< -t -c $(shell readlink -e .)/nginx.conf
	node --version >/dev/null

#
#
#
.build/nginx: $(FILES_DIR)/$(NGINX_SRC_FILE) Makefile ../../src/ngx_http_proxy_cache_invalidate_module.c
	rm -rf .build
	mkdir -p .build
	tar -C .build -zxf $<
	cd .build/$(NGINX_SRC_DIR) && ./configure $(NGINX_CONFIGURE_OPTS) && make
	cp .build/$(NGINX_SRC_DIR)/objs/nginx $@
	mkdir -p .build/logs

#
#
#
clean:
	rm -rf .build
#
#
#
$(FILES_DIR)/$(NGINX_SRC_FILE):
	mkdir -p $(FILES_DIR)
	wget $(NGINX_SRC_URL) -O $@
