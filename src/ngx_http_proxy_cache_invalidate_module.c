/*
 * Copyright (c) 2015 Sergey Egorov <egorovhome@gmail.com>
 *
 * This project was fully funded by yo.se.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDERS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#include <nginx.h>
#include <ngx_config.h>
#include <ngx_core.h>
#include <ngx_http.h>


static void *ngx_http_proxy_cache_invalidate_create_loc_conf(ngx_conf_t *cf);
static char *ngx_http_proxy_cache_invalidate_merge_loc_conf (ngx_conf_t *cf, void *parent, void *child);
static ngx_int_t  ngx_http_proxy_cache_invalidate_handler   (ngx_http_request_t *r);


typedef struct {
    ngx_array_t                  *cache_invalidate;
    ngx_shm_zone_t               *cache_zone;
    ngx_http_handler_pt           core_handler;
} ngx_http_proxy_cache_invalidate_loc_conf_t;


static ngx_http_module_t  ngx_http_proxy_cache_invalidate_module_ctx = {
    NULL,                                  /* preconfiguration */
    NULL,                                  /* postconfiguration */

    NULL,                                  /* create main configuration */
    NULL,                                  /* init main configuration */

    NULL,                                  /* create server configuration */
    NULL,                                  /* merge server configuration */

    ngx_http_proxy_cache_invalidate_create_loc_conf,  /* create location configuration */
    ngx_http_proxy_cache_invalidate_merge_loc_conf    /* merge location configuration */
};


static ngx_command_t  ngx_http_proxy_cache_invalidate_module_commands[] = {
    { ngx_string("proxy_cache_invalidate"),
      NGX_HTTP_MAIN_CONF|NGX_HTTP_SRV_CONF|NGX_HTTP_LOC_CONF|NGX_CONF_1MORE,
      ngx_http_set_predicate_slot,
      NGX_HTTP_LOC_CONF_OFFSET,
      offsetof(ngx_http_proxy_cache_invalidate_loc_conf_t, cache_invalidate),
      NULL },

      ngx_null_command
};


ngx_module_t  ngx_http_proxy_cache_invalidate_module = {
    NGX_MODULE_V1,
    &ngx_http_proxy_cache_invalidate_module_ctx,      /* module context */
    ngx_http_proxy_cache_invalidate_module_commands,  /* module directives */
    NGX_HTTP_MODULE,                       /* module type */
    NULL,                                  /* init master */
    NULL,                                  /* init module */
    NULL,                                  /* init process */
    NULL,                                  /* init thread */
    NULL,                                  /* exit thread */
    NULL,                                  /* exit process */
    NULL,                                  /* exit master */
    NGX_MODULE_V1_PADDING
};


static void *ngx_http_proxy_cache_invalidate_create_loc_conf(ngx_conf_t *cf)
{
    ngx_http_proxy_cache_invalidate_loc_conf_t  *conf;

    conf = ngx_pcalloc(cf->pool, sizeof(ngx_http_proxy_cache_invalidate_loc_conf_t));
    if (conf == NULL) {
        return NULL;
    }

    conf->cache_invalidate = NGX_CONF_UNSET_PTR;
    conf->cache_zone       = NULL;
    conf->core_handler     = NULL;

    return conf;
}


static char *ngx_http_proxy_cache_invalidate_merge_loc_conf(ngx_conf_t *cf, void *parent, void *child)
{
    ngx_http_proxy_cache_invalidate_loc_conf_t  *prev = parent;
    ngx_http_proxy_cache_invalidate_loc_conf_t  *conf = child;
    ngx_http_core_loc_conf_t                    *clcf;
    ngx_http_upstream_conf_t                    *ucf;

    ngx_conf_merge_ptr_value(conf->cache_invalidate,
                             prev->cache_invalidate, NULL);

    /*
        A bit of hack.
        The @ngx_http_proxy_loc_conf_t not defined in headers,
        but it first member upstream has type @ngx_http_upstream_conf_t
    */
    extern ngx_module_t  ngx_http_proxy_module;
    ucf = ngx_http_conf_get_module_loc_conf(cf, ngx_http_proxy_module);
    conf->cache_zone = ucf->cache_zone;
    if (conf->cache_zone == NULL) {
        conf->cache_zone = prev->cache_zone;
    }

    /*
        Do not install handler,
        if there is no rules nor cache zone defined.
    */
    clcf = ngx_http_conf_get_module_loc_conf(cf, ngx_http_core_module);
    if (conf->cache_invalidate != NULL &&
        conf->cache_zone       != NULL) {
        if ((conf->core_handler = clcf->handler) == NULL) {
            conf->core_handler = prev->core_handler;
        }
        if (conf->core_handler == NULL) {
            ngx_conf_log_error(NGX_LOG_EMERG, cf, 0, "http core has no handler defined");
            return NGX_CONF_ERROR;
        }
        clcf->handler = ngx_http_proxy_cache_invalidate_handler;
    }

    return NGX_CONF_OK;
}


/*
    A bit of copy-past from ngx_http_file_cache_forced_expire
*/
static void ngx_http_proxy_cache_zone_invalidate(ngx_http_request_t *r, ngx_shm_zone_t* cache_zone)
{
    ngx_http_file_cache_t       *cache = cache_zone->data; /* As seen in ngx_http_upstream_cache_get */
    ngx_queue_t                 *q;
    ngx_http_file_cache_node_t  *fcn;

    ngx_log_debug1(NGX_LOG_DEBUG_HTTP, r->connection->log, 0, "invalidate http cache \"%V\"", &cache_zone->shm.name);

    ngx_shmtx_lock(&cache->shpool->mutex);

    for (q = ngx_queue_last(&cache->sh->queue);
         q != ngx_queue_sentinel(&cache->sh->queue);
         q = ngx_queue_prev(q))
    {
        fcn = ngx_queue_data(q, ngx_http_file_cache_node_t, queue);
        fcn->exists = 0;

        ngx_log_debug6(NGX_LOG_DEBUG_HTTP, r->connection->log, 0,
                  "http file cache invalidate: #%d %d %02xd%02xd%02xd%02xd",
                  fcn->count, fcn->exists,
                  fcn->key[0], fcn->key[1], fcn->key[2], fcn->key[3]);

    }

    ngx_shmtx_unlock(&cache->shpool->mutex);
}


static ngx_int_t ngx_http_proxy_cache_invalidate_handler(ngx_http_request_t *r)
{
    ngx_http_proxy_cache_invalidate_loc_conf_t *conf;
    ngx_shm_zone_t                             *cache_zone;

    conf = ngx_http_get_module_loc_conf(r, ngx_http_proxy_cache_invalidate_module);
    cache_zone = conf->cache_zone;

    switch (ngx_http_test_predicates(r, conf->cache_invalidate)) {

    case NGX_ERROR:
        return NGX_ERROR;
        break;

    case NGX_DECLINED:
        /*
            Now we should invalidate the cache
        */
        ngx_http_proxy_cache_zone_invalidate(r, cache_zone);
        break;

    default: /* NGX_OK */
        break;
    }

    return conf->core_handler(r);
}
