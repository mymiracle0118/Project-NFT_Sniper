const solanaWeb3 = require("@solana/web3.js");
const pool = require("../db");
const axios = require("axios");
const NodeCache = require("node-cache");

const myCache = new NodeCache();

// Initialize constants
// const url = solanaWeb3.clusterApiUrl('mainnet-beta')
const url = "";
const connection = new solanaWeb3.Connection(url, "confirmed");

const sellerReferral = new solanaWeb3.PublicKey(
  "autMW8SgBkVYeBgqYiTuJZnkvDZMVU2MHJh9Jh7CSQ2"
);

async function createTransaction(
  buyer,
  seller,
  auctionHouseKey,
  mintAddress,
  tokenATA,
  price,
  sellerExpiry
) {
  try {
    const response = await axios({
      url: `https://api-mainnet.magiceden.dev/v2/instructions/buy_now?buyer=${buyer}&seller=${seller}&auctionHouseAddress=${auctionHouseKey}&tokenMint=${mintAddress}&tokenATA=${tokenATA}&price=${price}&sellerReferral=${sellerReferral.toString()}&sellerExpiry=${sellerExpiry}`,
      method: "GET",
      headers: {
        origin: "https://www.magiceden.io/",
        referer: "https://www.magiceden.io/",
      },
    });
    return response;
  } catch (e) {
    return;
  }
}

async function CheckForArray(array, valueArray) {
  let successCount = 0;
  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    for (const value of valueArray) {
      if (
        value.trait_type.toLowerCase() == element.trait_type.toLowerCase() &&
        value.value.toLowerCase() == element.value.toLowerCase()
      ) {
        successCount += 1;
      }
    }
  }
  if (successCount >= valueArray.length) {
    return true;
  }
  return false;
}

function CheckTransaction(logs) {
  let priceMessage;
  let TransactionLog;
  for (let index = 0; index < logs.length; index++) {
    const element = logs[index];
    if (
      element.indexOf("price") > -1 &&
      element.indexOf("seller_expiry") > -1
    ) {
      priceMessage = JSON.parse(element.substring(13));
    } else if (element == "Program log: Instruction: Sell") {
      TransactionLog = element;
    }
  }
  if (TransactionLog && priceMessage) {
    return priceMessage;
  }
  return null;
}

async function fetchNft(address, price, txndtl) {
  let nft;
  let floor;
  let collectionValue;
  try {
    // you might get rate limited without an extended API Key
    // so it's better to parse all of the nfts and store them in your database
    const results = (await axios({
      url: `https://api-mainnet.magiceden.dev/rpc/getNFTByMintAddress/${address}`,
      method: "GET",
      headers: {
        origin: "https://www.magiceden.io/",
        referer: "https://www.magiceden.io/",
      },
    })).data
    if (!results.results) {
      return;
    }
    if (results) {
      try {
        // select the nft from your database for rarities
      const poolQuery = await pool.query(
        "SELECT * FROM $1:name WHERE address = $2",
        [results.results.collectionName, address]
      );
      nft = poolQuery[0];
      collectionValue = results.results.collectionName;
      } catch (e) {
        // console.log(e.message)
      }
    }
    if (results) {
      const cacheFloor = myCache.get(collectionValue);
      if (cacheFloor == undefined) {
        const floorData = await axios.get(
          `https://api-mainnet.magiceden.dev/rpc/getCollectionEscrowStats/${collectionValue}`
        );
        floor = (floorData.data.results.floorPrice / 1000000000).toFixed(2);
        myCache.set(collectionValue, floor, 30);
      } else {
        floor = cacheFloor;
      }
    }
    if (nft && results) {
      // make the nft object according to how it is stored in your db
      // all the important constants needed for buying are in "txndtl"
      return {
        ...txndtl,
        id: nft.id,
        name: nft.name,
        image: nft.image,
        attributes: nft.attributes,
        rarity: nft.rarity,
        background: nft.background,
        percentageRarity: nft.percentage,
        price: price,
        floor: floor,
        total_count: JSON.parse(nft.attributes[0]).total_count,
        collectionTitle: results.results.collectionTitle,
        collectionValue: collectionValue,
      };
    } 
    else if (!nft && results) {
      // otherwise, if you don't have the nft in your database, the info from the request to magic eden is used
      return {
        ...txndtl,
        name: results.results.title,
        image: results.results.img,
        attributes: results.results.attributes,
        price: price,
        floor: floor,
        collectionTitle: results.results.collectionTitle,
        collectionValue: collectionValue,
      };
    }
    else {
      return null;
    }
  } catch (error) {
    console.error("listings.fetchNft", error);
  }
}

const parseTxnDtl = async (signature, price, sellerExpiry) => {
  try {
    const txn = await connection.getTransaction(signature);

    const accounts = txn.transaction.message.accountKeys;
    const seller = accounts[0].toString();
    const auctionHouseKey = accounts[7].toString();
    const tokenATA = accounts[1].toString();
    const nftAddress = txn.meta.postTokenBalances[0].mint;
    const txndtl = {
      seller: seller,
      auctionHouseKey: auctionHouseKey,
      mintAddress: nftAddress,
      tokenATA: tokenATA,
      price: price,
      sellerReferral: sellerReferral.toString(),
      sellerExpiry: sellerExpiry,
    };

    let fetchedNft;

    fetchedNft = await fetchNft(nftAddress, price, txndtl);
    return fetchedNft;
  } catch (e) {
    return null;
  }
};

module.exports = {
  CheckForArray,
  createTransaction,
  CheckTransaction,
  parseTxnDtl,
};
