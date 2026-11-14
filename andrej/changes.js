// Screen 03 – Change Requests: list with a status filter.
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");

    const FILTERS=["all","pending","approved","rejected"];
    let filter=FILTERS.includes(app.params.get("status"))
        ? app.params.get("status")
        : "all";

    async function load(context){
        const requests=await app.request(
            database.from("change_requests")
                .select("id,section_id,author_id,title,status,voting_closes,created_at")
                .eq("contract_id",context.contract.id)
                .order("created_at",{ascending:false})
        );

        const sections=await app.request(
            database.from("contract_sections")
                .select("id,kind")
                .eq("contract_id",context.contract.id)
        );

        let votes=[];

        if(requests.length>0){
            votes=await app.request(
                database.from("change_votes")
                    .select("change_request_id,user_id")
                    .in("change_request_id",requests.map(function(item){
                        return item.id;
                    }))
            );
        }

        return {requests:requests,sections:sections,votes:votes};
    }

    function render(context,data){
        const shown=data.requests.filter(function(item){
            return filter==="all" || item.status===filter;
        }).sort(function(first,second){
            // Requests that still need votes come first.
            return (first.status==="pending" ? 0 : 1)-
                (second.status==="pending" ? 0 : 1);
        });

        const filters=h("div",{class:"segmented",role:"group",ariaI18n:"changes.filterLabel"},
            FILTERS.map(function(name){
                return h("button",{
                    type:"button",
                    "aria-pressed":String(filter===name),
                    i18n:"filters."+name,
                    onclick:function(){
                        filter=name;
                        render(context,data);
                    }
                });
            })
        );

        if(shown.length===0){
            app.fill(content,
                filters,
                app.emptyState(
                    "changes.emptyTitle",
                    filter==="all" ? "changes.emptyHint" : "changes.emptyFilteredHint"
                )
            );
            return;
        }

        app.fill(content,
            filters,
            h("p",{class:"muted","aria-live":"polite",i18n:["changes.count",{count:shown.length}]}),
            h("ul",{class:"list"},shown.map(function(item){
                const section=data.sections.find(function(entry){
                    return entry.id===item.section_id;
                });
                const itemVotes=data.votes.filter(function(vote){
                    return vote.change_request_id===item.id;
                });
                const voted=itemVotes.some(function(vote){
                    return vote.user_id===context.user.id;
                });
                const left=app.daysUntil(item.voting_closes);

                return h("li",null,
                    h("a",{class:"list-item card",href:app.url("voting.html",{id:item.id})},
                        h("span",{class:"badges"},app.badge(item.status)),
                        h("span",{class:"item-title",text:item.title}),
                        h("span",{class:"muted small"},
                            app.memberName(item.author_id)," · ",
                            section ? h("span",{i18n:"sectionKind."+section.kind}) : null
                        ),
                        item.status==="pending"
                            ? h("span",{class:"muted small"},
                                h("span",{i18n:["changes.votesProgress",{
                                    cast:itemVotes.length,
                                    total:context.members.length
                                }]}),
                                " · ",
                                h("span",{i18n:left>=0
                                    ? ["changes.closesIn",{count:left}]
                                    : "changes.closed"})
                            )
                            : h("span",{class:"muted small",i18n:["changes.proposedOn",{
                                date:app.formatDate(item.created_at)
                            }]}),
                        item.status==="pending" && !voted
                            ? h("span",{class:"pill-action",i18n:"changes.notVotedYet"})
                            : null
                    )
                );
            }))
        );
    }

    app.start({load:load,render:render});
})();
