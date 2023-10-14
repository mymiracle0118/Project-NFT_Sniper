import { useContext, useEffect, useState } from 'react';

import { SocketContext } from 'components/context/socket';

export const useLiveNftSniper = () => {
  const [collections, setCollections] = useState([])  //selected collections
  const [price, setPrice] = useState([]) //price filters of the user
  const [rarity, setRarity]  = useState([]) //rarity filters of the user
  const socket = useContext(SocketContext); //the websocket connection to the server
  const [unhandledNft, setUnhandledNft] = useState();

  const [liveNfts, setLiveNfts] = useState([]) //live listings

  useEffect(() => {
    if (unhandledNft) {
      if (nftSuitConditions(unhandledNft)) {
        setLiveNfts((prev) => [...prev, unhandledNft]);
      }

      setUnhandledNft(undefined);
    }
  }, [unhandledNft]);

  useEffect(() => {
    return () => {
      // before the component is destroyed
      // unbind all event handlers used in this component
      socket.off('newnft');
    };
  }, [socket]);

  const startMonitor = () => {
    socket.on('newnft', (newNft) => {
      if (newNft) setUnhandledNft(newNft);
    });
  };

  const stopMonitor = () => {
    socket.off('newnft');
  };

  const nftSuitConditions = (nft) => {
    const choosenColl = collections.find(
      (col) => col.value === nft.collectionValue
    );
    let priceSlider = price;
    let raritySlider = rarity;
    if (choosenColl) {
      priceSlider = choosenColl.price;
      raritySlider = choosenColl.rarity;
    }
    const nftRarity = nft.percentageRarity;
    const maxPrice = priceSlider[1] === 30 ? 10000 : priceSlider[1];

    return (
      (choosenColl || collections.length === 0) &&
      nft.price >= priceSlider[0] &&
      nft.price <= maxPrice &&
      // pay attension if you're going to copy this to autobuy!
      (isNaN(nftRarity) ||
        (nftRarity <= raritySlider[1] && nftRarity >= raritySlider[0]))
    );
  };

  return { startMonitor, stopMonitor };
};