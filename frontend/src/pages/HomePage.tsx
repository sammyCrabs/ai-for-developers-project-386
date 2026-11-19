import { Button, List, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

const steps = ["Выберите тип встречи", "Выберите дату и время", "Оставьте имя и email"];

export function HomePage() {
  return (
    <Stack gap="xl" py="xl">
      <Stack gap="sm">
        <Title order={1}>Календарь звонков</Title>
        <Text size="lg" c="dimmed">
          Выберите тип встречи и удобное время — без переписки.
        </Text>
        <Button component={Link} to="/book" size="md" w="fit-content">
          Записаться
        </Button>
      </Stack>
      <Stack gap="sm">
        <Title order={2}>Как это работает</Title>
        <List type="ordered" spacing="xs">
          {steps.map((step) => (
            <List.Item key={step}>{step}</List.Item>
          ))}
        </List>
      </Stack>
    </Stack>
  );
}
