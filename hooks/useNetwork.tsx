import { useState, useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";

export const useNetwork = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isConnected is false when physically disconnected from Wi-Fi/Cellular
      // isInternetReachable is false when connected to a router without actual internet
      const offline =
        state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, []);

  return { isOffline };
};
