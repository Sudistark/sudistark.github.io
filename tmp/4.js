var test = setInterval(()=>{
    try{
        clients.matchAll().then( c => {
  
        c[0].navigate(`javascript:alert()`).then(()=>clearInterval(test));
            
        })
    }catch(r){}
    
},1000)
