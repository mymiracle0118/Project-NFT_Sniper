const express = require("express");
const { Connection, LAMPORTS_PER_SOL, PublicKey } = require("@solana/web3.js");
// const path = require("path");
const {
  parseTxnDtl,
  CheckTransaction,
} = require("./tools/listings");

const sellerReferral = new PublicKey(
  "autMW8SgBkVYeBgqYiTuJZnkvDZMVU2MHJh9Jh7CSQ2"
);

const url = "";
const connection = new Connection(url, "confirmed");

const app = express();

app.use(express.json({ extended: true }));
app.use(
  express.urlencoded({
    extended: true,
  })
);
//   app.use("/api", require("./routes"));

//   if (process.env.NODE_ENV === "production") {
//     app.use("/", express.static(path.join(__dirname, "client", "build")));

//     app.get("*", (req, res) => {
//       res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
//     });
//   }

const PORT = 5000;

// app.listen(PORT, () => console.log(`App has been started on port ${PORT}`));

const server = require("http").createServer(app);
const io = require("socket.io")(server);

let logging = connection.onLogs(
  sellerReferral,
  async (logs) => {
    // io.on("connection", async (client) => {
    const checkTxnInfo = CheckTransaction(logs.logs);

    if (checkTxnInfo != null) {
      const price = checkTxnInfo.price / LAMPORTS_PER_SOL;
      const sellerExpiry = checkTxnInfo.seller_expiry;

      parseTxnDtl(logs.signature, price, sellerExpiry).then((nft) => {
        if (nft) {
          io.emit("newnft", nft);
        }
      });
    }
    // });
  },
  "confirmed"
);

server.listen(PORT, () => {
  console.log(`App is running on http://localhost:${PORT}`);
});
