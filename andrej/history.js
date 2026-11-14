// Screen 09 – Agreement History: every change, vote result and resolution.
// Events are stored as a type plus values and translated here, so the
// history reads correctly in every language.
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");

    const FILTERS=["all","changes","conflicts"];
    let filter="all";

    async function load(context){
        return await app.request(
            database.from("contract_history")
                .select("id,type,actor_id,params,created_at")
                .eq("contract_id",context.contract.id)
                .order("id",{ascending:false})
        );
    }

    function matches(event){
        if(filter==="changes"){
            return event.type.startsWith("change_");
        }

        if(filter==="conflicts"){
            return event.type.startsWith("conflict_") ||
                event.type.startsWith("resolution_");
        }

        return true;
    }

    function render(context,events){
        const shown=events.filter(matches);
        const days=[];

        // Group events by calendar day in the user's language and time zone.
        shown.forEach(function(event){
            const day=app.formatDate(event.created_at,{dateStyle:"full"});
            const last=days[days.length-1];

            if(last && last.day===day){
                last.events.push(event);
            }else{
                days.push({day:day,events:[event]});
            }
        });

        app.fill(content,
            h("div",{class:"segmented",role:"group",ariaI18n:"history.filterLabel"},
                FILTERS.map(function(name){
                    return h("button",{
                        type:"button",
                        "aria-pressed":String(filter===name),
                        i18n:"history.filter."+name,
                        onclick:function(){
                            filter=name;
                            render(context,events);
                        }
                    });
                })
            ),
            shown.length===0
                ? app.emptyState("history.empty","history.emptyHint")
                : h("div",null,days.map(function(group){
                    return h("section",{"aria-label":group.day},
                        h("h2",{class:"eyebrow",text:group.day}),
                        h("ol",{class:"timeline"},group.events.map(function(event){
                            const known=i18next.exists("history.event."+event.type);

                            return h("li",{class:"timeline-item"},
                                h("p",{i18n:[
                                    known ? "history.event."+event.type : "history.event.unknown",
                                    event.params || {}
                                ]}),
                                h("p",{class:"muted small"},
                                    event.actor_id
                                        ? app.memberName(event.actor_id)
                                        : h("span",{i18n:"history.byTeam"}),
                                    " · ",
                                    h("time",{
                                        datetime:event.created_at,
                                        text:app.formatDateTime(event.created_at)
                                    })
                                )
                            );
                        }))
                    );
                }))
        );
    }

    app.start({load:load,render:render});
})();
