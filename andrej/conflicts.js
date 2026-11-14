// Conflicts tab: every reported conflict, with a status filter.
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");

    const FILTERS=["all","open","under_review","resolved"];
    const SEVERITY_ORDER={high:0,medium:1,low:2};
    let filter=FILTERS.includes(app.params.get("status"))
        ? app.params.get("status")
        : "all";

    async function load(context){
        return await app.request(
            database.from("conflicts")
                .select("id,reporter_id,title,severity,status,created_at")
                .eq("contract_id",context.contract.id)
                .order("created_at",{ascending:false})
        );
    }

    function render(context,conflicts){
        const shown=conflicts.filter(function(item){
            return filter==="all" || item.status===filter;
        }).sort(function(first,second){
            // Unresolved first, then the most urgent.
            const resolved=(first.status==="resolved" ? 1 : 0)-
                (second.status==="resolved" ? 1 : 0);

            return resolved ||
                SEVERITY_ORDER[first.severity]-SEVERITY_ORDER[second.severity];
        });

        const filters=h("div",{class:"segmented",role:"group",ariaI18n:"conflicts.filterLabel"},
            FILTERS.map(function(name){
                return h("button",{
                    type:"button",
                    "aria-pressed":String(filter===name),
                    i18n:"filters."+name,
                    onclick:function(){
                        filter=name;
                        render(context,conflicts);
                    }
                });
            })
        );

        if(shown.length===0){
            app.fill(content,
                filters,
                app.emptyState("conflicts.emptyTitle","conflicts.emptyHint")
            );
            return;
        }

        app.fill(content,
            filters,
            h("p",{class:"muted","aria-live":"polite",i18n:["conflicts.count",{count:shown.length}]}),
            h("ul",{class:"list"},shown.map(function(item){
                return h("li",null,
                    h("a",{class:"list-item card",href:app.url("conflict.html",{id:item.id})},
                        h("span",{class:"badges"},
                            app.badge(item.status),
                            app.badge(item.severity,"severity")
                        ),
                        h("span",{class:"item-title",text:item.title}),
                        h("span",{class:"muted small"},
                            h("span",{i18n:["conflicts.reportedBy",{
                                name:app.memberName(item.reporter_id)
                            }]}),
                            " · ",
                            app.formatRelative(item.created_at)
                        )
                    )
                );
            }))
        );
    }

    app.start({load:load,render:render});
})();
