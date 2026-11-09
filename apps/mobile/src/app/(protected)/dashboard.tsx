import { useRouter } from "expo-router";
import { View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";

export default function DashboardScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/sign-in");
  };

  return (
    <ScreenContainer scrollable={false} className="justify-between py-10">
      <View className="gap-2">
        <Text variant="h3">Olá, {session?.user.name}</Text>
        <Text variant="muted">{session?.user.email}</Text>
      </View>

      <Button variant="outline" size="lg" onPress={signOut}>
        <Text>Sair</Text>
      </Button>
    </ScreenContainer>
  );
}
