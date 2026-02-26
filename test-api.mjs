async function testAPI() {
    console.log("1. Buscando TODOS os jobs via GET /jobs...");
    const getRes = await fetch(`http://127.0.0.1:3001/jobs`);
    const getData = await getRes.json();

    console.log(`Status GET: ${getRes.status}`);
    console.log("Resposta GET:", getData);
}

testAPI();
