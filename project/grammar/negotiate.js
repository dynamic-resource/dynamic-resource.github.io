let color_scale = []

cs = d3.scaleOrdinal(d3.schemeCategory10)

for(let c = 0 ; c < 10; c++){
    color_scale[c] = cs(c)
}

function partition(data) {
    const root = d3.hierarchy(data)
        .sum(d => 1);
    return d3.partition()
        .size([2 * Math.PI, root.height + 1])
        (root);
}

function render_sunburst(data) {
    const width = 500
    const root = partition(data);

    format = d3.format(",d")

    radius = width / 8.0;

    root.each(d => d.current = d);

    arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
        .padRadius(radius * 1.5)
        .innerRadius(d => d.y0 * radius)
        .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))

    const svg = d3.create("svg")
        .attr("viewBox", [0, 0, width, width])
        .style("font", "10px sans-serif");

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${width / 2})`);

    const path = g.append("g")
        .selectAll("path")
        .data(root.descendants().slice(1))
        .join("path")
        .attr("fill", d => {
            //alert(d.y1)
            if(d.y1 <= 3)
            {
                return d3.rgb(200, 200, 200); 
            }
            else
            {
                return color_scale[d.data.id - 1]; 
            }})
        .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.8 : 0.6) : 0)
        .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")

        .attr("d", d => arc(d.current));

    path.filter(d => d.children)
        .style("cursor", "pointer")
        .on("click", clicked);

    path.append("title")
        .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n JOB: ${d.data.id}`);

    const label = g.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .style("user-select", "none")
        .selectAll("text")
        .data(root.descendants().slice(1))
        .join("text")
        .attr("dy", "0.35em")
        .attr("fill-opacity", d => +labelVisible(d.current))
        .attr("transform", d => labelTransform(d.current))
        .text(d => d.data.name);

    const parent = g.append("circle")
        .datum(root)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("click", clicked);

    function clicked(event, p) {
        parent.datum(p.parent || root);

        root.each(d => d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth)
        });

        const t = g.transition().duration(750);

        // Transition the data on all arcs, even the ones that aren’t visible,
        // so that if this transition is interrupted, entering arcs will start
        // the next transition from the desired position.
        path.transition(t)
            .tween("data", d => {
                const i = d3.interpolate(d.current, d.target);
                return t => d.current = i(t);
            })
            .filter(function (d) {
                return +this.getAttribute("fill-opacity") || arcVisible(d.target);
            })
            .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.8 : 0.6) : 0)
            .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
            .attrTween("d", d => () => arc(d.current));

        label.filter(function (d) {
            return +this.getAttribute("fill-opacity") || labelVisible(d.target);
        }).transition(t)
            .attr("fill-opacity", d => +labelVisible(d.target))
            .attrTween("transform", d => () => labelTransform(d.current));
    }

    function arcVisible(d) {
        return d.y1 <= 5 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function labelVisible(d) {
        return d.y1 <= 5 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    function labelTransform(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2 * radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

    d3.select("#render").remove()
    d3.select("#view").append(() => svg.node()).attr("id", "render")
}

function gendata() {
    node_count = $("#nnode").val()

    nodes = []

    for (n = 0; n < node_count; n++) {

        numa_count = $("#nnuma").val()

        numas = []
        for (nu = 0; nu < numa_count; nu++) {
            slots = []

            slot_count = $("#nslot").val()

            for (i = 0; i < slot_count; i++) {
                slots.push({ "name": "Slot " + i, "id": 0, "children": [] })
            }

            new_numa = { "name": "Numa " + nu, "id": 0, "children": slots }
            numas.push(new_numa)
        }

        new_node = { "name": "Node " + n, "id": 0, "children": numas }
        nodes.push(new_node)

    }

    data = { "name": "Negotiate", "id": 0, "children": nodes }

    return data
}



function bad_syntax(reason)
{
    $("#syntax").html(reason);
    return 1;
}



let directives = []




function addEntry(mode, level, directive)
{

    directives.push({"mode" : mode, "level" : level})

    return null
}


function parseLevel(mode, directive)
{
    if(!directive)
    {
        return addEntry(mode, "slot", "")
    }


    posibilities = ["job", "node", "numa", "slot"]

    let error =  "No such level '" + directive + "'"

    posibilities.forEach(
        e =>{
            if(directive.startsWith(e))
            {
                error = addEntry(mode, e, directive.slice(e.length))
            }
        }
    )

    if(error)
    {
        return error
    }

    return null
}


function parseNumeric(directive)
{
    count = parseInt(directive)
    directive = directive.slice(("" + count).length)
    return parseLevel(count, directive)
}


function parseSchema(directive)
{
    if(!directive)
    {
        return "Directive cannot be empty"
    }

    directive = directive.toLowerCase()


    if(!isNaN(directive[0]))
    {
        return parseNumeric(directive)
    }
    else if( ( ["a", "e"].indexOf(directive[0]) >= 0 ) )
    {
        return parseLevel(directive[0], directive.slice(1))
    }
    else
    {
        return "Could not parse directive '" + directive + "'";
    }

    return null
}


function validateSchema()
{
    directives = []
    //$("#syntax").html("");

    schema = $("#balance").val()


    entries = schema.split(",")

    if(!entries[0])
    {
        return bad_syntax("No schema was provided")
    }

    if(entries.length > 10)
    {
        return bad_syntax("Only up to 10 policies are supported")
    }

    let had_error = 0

    entries.forEach(d => {
        if(had_error)
        {
            return
        }


        error = parseSchema(d)

        if(error)
        {
            had_error = 1
            return bad_syntax(error)
        }

    });


    if(!error)
    {
        $("#syntax").html("");
    }

    return 0
}


function mapSchema(data)
{
    $('#summary').empty()

    job_count = 1
    node_count = parseInt($("#nnode").val())
    numa_count = parseInt($("#nnuma").val())
    slot_count = parseInt($("#nslot").val())

    all_slots = slot_count * numa_count * node_count

    slot_left = all_slots

    let each_delta = 0

    /* Parse all each directives */
    for(i=0; i  < directives.length; i++)
    {
        d = directives[i]

        d["id"] = i + 1
        d["cnt"]  = 0


        if(d["mode"] != "e")
        {
            continue
        }

        if(d["level"] == "slot")
        {
            d["cnt"] = slot_count * numa_count * node_count
        }else if(d["level"] == "numa")
        {
            d["cnt"] = numa_count * node_count
            each_delta += numa_count
        }
        else if(d["level"] == "node")
        {
            d["cnt"] = node_count
            each_delta += 1
        }
        else if(d["level"] == "job")
        {
            d["cnt"] = job_count
        }

        slot_left -= d["cnt"]
    }

    /* Parse Fixed Directives */
    for(i=0; i  < directives.length; i++)
    {
        d = directives[i]

        if( (d["mode"] == "e") || (d["mode"] == "a"))
        {
            continue
        }

        d["cnt"] = parseInt(d["mode"])

        if(d["level"] == "numa")
        {
            d["cnt"] *= slot_count
            d["cnt"] -= each_delta
        }
        else if(d["level"] == "node")
        {
            d["cnt"] *= (slot_count * numa_count)
            d["cnt"] -= each_delta
        }
        else if(d["level"] == "job")
        {
            d["cnt"] *= (slot_count * numa_count * node_count)
        }


        slot_left -= d["cnt"]
    }


    /* Map the rest (al) */

    to_split = slot_left

    if(slot_left < 0)
    {
        to_split = 0
    }

    all_count = 0
    last_all = -1

    for(i=0; i  < directives.length; i++)
    {
        d = directives[i]

        if(d["mode"] != "a")
        {
            continue
        }

        last_all = i

        all_count++
    }

    quantum = Math.floor(to_split / all_count)

    if(quantum == 0)
    {
        return bad_syntax("No resource left to split")
    }

    for(i=0; i  < directives.length; i++)
    {
        d = directives[i]

        if(d["mode"] != "a")
        {
            continue
        }

        if( (to_split < quantum) || (i == last_all) )
        {
            d["cnt"] = to_split
        }
        else
        {
            d["cnt"] = quantum
        }

        to_split -= d["cnt"]
    }   


    total_slots = 0

    for(i=0; i  < directives.length; i++)
    {
        d = directives[i]
        total_slots += d["cnt"]
    }

    if(total_slots > all_slots)
    {
        return bad_syntax("Cannot allocate " + total_slots + " over " + all_slots + " available.")
    }

    /* Render summary table */

    new_html = '<table class="blueTable"><tr><th>ID</th><th>Mode/Count</th><th>Level</th><th>Slot Count</th></tr>'

    directives.forEach(d => {
        md = d["mode"]
    
        if(md == "a")
        {
            md = "all"
        }
        else if(md == "e")
        {
            md = "each"
        }


        new_html += '<tr><td bgcolor=" '+ color_scale[d["id"]-1].toString() +' ">' + d['id'] + '</td><td>' + md + '</td><td>' + d["level"] +'</td><td>' + d["cnt"] +'</td></tr>';

   })

   if(all_slots - total_slots)
   {
        new_html += '<tr><td>Not Allocated</td><td></td><td></td><td>' + (all_slots - total_slots) +'</td></tr>';

   }


   new_html +=  '</table>' 
   
    $('#summary').append( new_html )

    let last_node = 0
   function map_tonode(data, nid, id)
   {

        let nodes = data["children"]
        let  nnode = data["children"].length

        for(let n = last_node + 1; n < (nnode + last_node + 1); n++)
        {
            last_node = n
            let numas = nodes[n % nnode]["children"]

            for(let i = 0 ; i < numas.length; i++)
            {
                for(let j = 0 ; j < numas[i]["children"].length; j++)
                {
                    if(numas[i]["children"][j]["id"] == 0)
                    {
                        numas[i]["children"][j]["id"] = id
                        return 1
                    }
                }
            }

        }

        return 0
   }

   function get_nth_numa(data, id)
   {
        let cnt = 0
        let nodes = data["children"]
        for(let i = 0 ; i < nodes.length; i++)
        {
            let numas = nodes[i]["children"]

            for(let j = 0 ; j < numas.length; j++)
            {
                if(cnt == id)
                {
                    return numas[j]["children"]
                }
                cnt++
            }

        }
   }

   let last_numa = 0

   function map_tonuma(data, nid, id)
   {
        let nodes = data["children"]
        let numa_count = parseInt($("#nnuma").val())

        let max_numa = nodes.length * numa_count

        for(let i = last_numa + 1 ; i < (max_numa + last_numa + 1); i++)
        {
            last_numa = i
            slots = get_nth_numa(data, i % max_numa)
            for( let j = 0 ; j < slots.length ; j++)
            {
                if(slots[j]["id"] == 0)
                {
                    slots[j]["id"] = id
                    return 1
                }
            }
        }

        return 0
   }

   function map_toslot(data, sid, id)
   {
        nodes = data["children"]

        for(let i = 0 ; i < nodes.length; i++)
        {
            numas = nodes[i]["children"]

            for(let j = 0 ; j < numas.length; j++)
            {
                slots = numas[j]["children"]

                for(let k = 0 ; k < slots.length; k++)
                {
                    if(slots[k]["id"] == 0)
                    {
                        slots[k]["id"] = id
                        return 1
                    }
                }
            }
        }

        return 0
   }

   function applyEach(data, max_count, count, level, id)
   {
       let to_map = count

        let applier = map_toslot

        if(level == "numa")
        {
            applier = map_tonuma
        }else if(level == "node")
        {
            applier = map_tonode
        }

        let cnt = 0

       while(to_map > 0)
       {
           if( applier(data, to_map, id) )
           {
            to_map--
           }

           if(cnt >= max_count)
           {
               return bad_syntax("Cannot satisfy resource constraint")
           }

           cnt++
       }
   }


    /* It is not time to map our allocs */

    /* Parse all each directives */
    for(let p=0; p  < directives.length; p++)
    {
        let d = directives[p]

        if(d["mode"] != "e")
        {
            continue
        }


        applyEach(data, all_slots, d["cnt"], d["level"], d["id"])
    }

    for(let p=0; p  < directives.length; p++)
    {
        let d = directives[p]

        if( (d["mode"] == "e") || (d["mode"] == "a"))
        {
            continue
        }


        applyEach(data, all_slots, d["cnt"], "slot", d["id"])
    }

    let levels = ["node","numa", "slot"]


    for(let l = 0; l < levels.length; l++)
    {
        for(let p=0; p  < directives.length; p++)
        {
            let d = directives[p]

            if((d["mode"] != "a") || (d["level"] != levels[l]))
            {
                continue
            }


            applyEach(data, all_slots, d["cnt"], d["level"], d["id"])
        }
    }


    return null

}





function updategraph() {
    if( validateSchema() )
    {
        return
    }


    data = gendata()

    if( mapSchema(data) )
    {
        return
    }

    render_sunburst(data)
}

$(function () {
    $("#slidern").slider({
        range: "max",
        min: 1,
        max: 16,
        value: 4,
        slide: function (event, ui) {
            $("#nnode").val(ui.value);
            updategraph()
        }
    });
    $("#nnode").val($("#slidern").slider("value"));

    $("#slidernu").slider({
        range: "max",
        min: 1,
        max: 4,
        value: 2,
        slide: function (event, ui) {
            $("#nnuma").val(ui.value);
            updategraph()
        }
    });
    $("#nnuma").val($("#slidernu").slider("value"));

    $("#slidersl").slider({
        range: "max",
        min: 1,
        max: 32,
        value: 8,
        slide: function (event, ui) {
            $("#nslot").val(ui.value);
            updategraph()
        }
    });
    $("#nslot").val($("#slidersl").slider("value"));

    $("#balance").on("input", function (event) {
        updategraph()
    })

    updategraph();
});
