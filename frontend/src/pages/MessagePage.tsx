import { Anchor, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

/** Страница с заголовком, коротким сообщением и ссылкой на Главную: заглушки разделов и «Страница не найдена». */
export function MessagePage({ title, message }: { title: string; message: string }) {
  return (
    <Stack gap="md" py="xl">
      <Title order={1}>{title}</Title>
      <Text c="dimmed">{message}</Text>
      <Anchor component={Link} to="/">
        На главную
      </Anchor>
    </Stack>
  );
}
