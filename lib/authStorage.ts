import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "malyan-auth";

export async function getSession(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === "1";
}

export async function setSession(active: boolean): Promise<void> {
  if (active) await AsyncStorage.setItem(KEY, "1");
  else await AsyncStorage.removeItem(KEY);
}
