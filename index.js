const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.get("/api/get", (req, res) => {
    res.json({ok:true});
})
app.get("/api/get/:id", (req, res) => {
    const id = req.params.id
    res.json({ok: false, id: id})
})
app.post("/api/post", (req, res) => {
    const { id, name } = req.body;
    res.json({ok: true, id: id, name: name})
})
app.put("/api/put/:id", (req, res) => {
    const { id } = req.params
    const { name } = req.body
    res.json({ok: true, id: id, name: name})
})
app.patch("/api/patch/:id", (req, res) => {
    const { id } = req.params
    const { name } = req.body
    res.json({ok: true, id: id, name: name})
})
app.delete("/api/delete/:id", (req, res) => {
    const { id } = req.params;
    res.json({ok: true, id: id})
})

app.listen(3000, () => console.log("run express server"));