const express = require("express");

const app = express();
const PORT = 3000;

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
app.use(express.static(__dirname));

app.get("/api/rs3", async (req, res) => {
    const username = req.query.player;

    if (!username) {
        return res.status(400).send("Missing player username");
    }

    try {
        const rsUrl = `https://secure.runescape.com/m=hiscore/index_lite.ws?player=${encodeURIComponent(username)}`;
        const response = await fetch(rsUrl);

        if (!response.ok) {
            return res.status(response.status).send(`RuneScape API returned ${response.status}`);
        }

        const dataText = await response.text();
        res.send(dataText);
    } catch (error) {
        console.error("Server fetch error:", error);
        res.status(500).send("Failed to fetch RS3 data");
    }
});

app.get("/api/rankings", async (req, res) => {
    const category = req.query.category || "0";
    const page = req.query.page || "1";

    try {
        const rankingsUrl = `https://secure.runescape.com/m=hiscore/ranking?category_type=0&table=${category}&page=${page}`;
        const response = await fetch(rankingsUrl);

        if (!response.ok) {
            return res.status(response.status).send(`Rankings API returned ${response.status}`);
        }

        const dataText = await response.text();
        res.send(dataText);
    } catch (error) {
        console.error("Server rankings fetch error:", error);
        res.status(500).send("Failed to fetch rankings");
    }
});

app.get("/api/activity", async (req, res) => {
    const username = req.query.player;

    if (!username) {
        return res.status(400).send("Missing username");
    }
    try {
        const url = `https://secure.runescape.com/m=adventurers-log/activity?searchName=${encodeURIComponent(username)}`;
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).send("Activity unavailable");
        }

        const html = await response.text();

        res.send(html);

    } catch (error) {
        console.error("Activity fetch error:", error);
        res.status(500).send("Failed to fetch activity");
    }
});

app.get("/api/quests", async (req, res) => {
    const username = req.query.player;

    if (!username) {
        return res.status(400).send("Missing username");
    }

    try {
        const url = `https://secure.runescape.com/m=adventurers-log/quests?searchName=${encodeURIComponent(username)}`;
        const response = await fetch(url);

        if (!response.ok) {
            return res.status(response.status).send("Quest list unavailable");
        }

        const html = await response.text();
        res.send(html);
    } catch (error) {
        console.error("Quest fetch error:", error);
        res.status(500).send("Failed to fetch quest list");
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});