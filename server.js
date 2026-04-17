const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 3000 });

let players = {};
let bullets = [];
let loot = generateLoot();

function rand(min,max){return Math.random()*(max-min)+min;}

function generateLoot(){
    let arr=[];
    for(let i=0;i<20;i++){
        arr.push({
            id:i,
            x:rand(-50,50),
            z:rand(-50,50),
            type:"medkit"
        });
    }
    return arr;
}

function broadcast(){
    const data = JSON.stringify({
        type:"state",
        players,
        bullets,
        loot
    });

    wss.clients.forEach(c=>{
        if(c.readyState===1) c.send(data);
    });
}

wss.on("connection",(ws)=>{
    const id = Math.random().toString(36).substr(2,9);

    players[id]={
        x:0,z:0,
        hp:100,
        shield:50,
        kills:0
    };

    ws.send(JSON.stringify({type:"init",id}));

    ws.on("message",(msg)=>{
        const data = JSON.parse(msg);
        const p = players[id];
        if(!p) return;

        // MOVE
        if(data.type==="move"){
            p.x=data.x;
            p.z=data.z;
        }

        // SHOOT
        if(data.type==="shoot"){
            bullets.push({
                x:p.x,
                z:p.z,
                vx:data.dx,
                vz:data.dz,
                owner:id
            });
        }

        // PICKUP LOOT
        if(data.type==="loot"){
            const item = loot.find(l=>l.id===data.id);
            if(item){
                if(item.type==="medkit"){
                    p.hp=Math.min(100,p.hp+40);
                }
                loot = loot.filter(l=>l.id!==data.id);
            }
        }

        // BUILD
        if(data.type==="build"){
            // simple: add wall as bullet-block
            bullets.push({
                x:p.x+data.dx,
                z:p.z+data.dz,
                vx:0,
                vz:0,
                wall:true,
                hp:100,
                owner:id
            });
        }
    });

    ws.on("close",()=>{
        delete players[id];
    });
});

// GAME LOOP PHYSICS
setInterval(()=>{
    // bullets movement
    bullets.forEach(b=>{
        b.x+=b.vx;
        b.z+=b.vz;
    });

    // collision bullet-player
    bullets.forEach(b=>{
        if(b.wall) return;

        for(let id in players){
            const p = players[id];
            if(Math.hypot(p.x-b.x,p.z-b.z)<2){
                p.hp-=20;

                if(p.hp<=0){
                    players[b.owner].kills++;
                    p.hp=100;
                    p.x=rand(-20,20);
                    p.z=rand(-20,20);
                }
            }
        }
    });

    broadcast();
},50);

console.log("V3 PRO BR SERVER RUNNING");
