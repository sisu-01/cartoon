const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const users = [
 { id: 1, name: "유저1" },
 { id: 2, name: "유저2" },
 { id: 3, name: "유저3" }
];


app.get("/", (req, res) => {
    res.send("Hello World");
});

app.get("/api/get", (req, res) => {
    res.json({ok: true, users: users});
})
app.get("/api/get/:id", (req, res) => {
    const id = req.params.id
    const user = users.filter(data => data.id == id);
    res.json({ok: false, user: user})
})
app.post("/api/post", (req, res) => {
    const { id, name } = req.body;
    temp = {
        id: id,
        name: name,
    }
    res.json({ok: true, temp: temp})
})
app.put("/api/users/update", (req, res) => {
    
    // 구조분해를 통해 id 와 name을 추출
    const { id, name } = req.body

    //map 함수는 자바스크립트에서 배열 함수이다. 요소를 일괄적으로 변경할 때 사용됩니다.
    const user = users.map(data => {

        if(data.id == id) data.name = name

        return {
            id: data.id,
            name: data.name
        }
    })

    res.json({ok: true, users: user})
})
app.patch("/api/user/update/:id", (req, res) => {

    const { id } = req.params
    const { name } = req.body

    //map 함수는 자바스크립트에서 배열 함수이다. 요소를 일괄적으로 변경할 때 사용됩니다.
    const user = users.map(data => {

        if(data.id == id) data.name = name

        return {
            id: data.id,
            name: data.name
        }
    })

    res.json({ok: true, users: user})
})
app.delete("/api/delete/:id", (req, res) => {
    const id = req.query.id
    const user = users.filter(data => data.id != id );
    res.json({ok: true, users: user})
})

// http listen port 생성 서버 실행
app.listen(3000, () => console.log("run express server"));