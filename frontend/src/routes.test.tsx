import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { routes } from "./routes.tsx";

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(
    <MantineProvider>
      <RouterProvider router={router} />
    </MantineProvider>,
  );
  return { user: userEvent.setup() };
}

describe("Главная страница", () => {
  it("рассказывает о сервисе и о том, как записаться", () => {
    renderAt("/");

    expect(screen.getByRole("heading", { level: 1, name: "Календарь звонков" })).toBeInTheDocument();
    expect(screen.getByText("Выберите тип встречи и удобное время — без переписки.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Записаться" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Как это работает" })).toBeInTheDocument();
    expect(screen.getByText("Выберите тип встречи")).toBeInTheDocument();
    expect(screen.getByText("Выберите дату и время")).toBeInTheDocument();
    expect(screen.getByText("Оставьте имя и email")).toBeInTheDocument();
  });

  it("кнопка «Записаться» ведёт в Каталог типов встреч", async () => {
    const { user } = renderAt("/");

    await user.click(screen.getByRole("link", { name: "Записаться" }));

    expect(screen.getByRole("heading", { level: 1, name: "Каталог типов встреч" })).toBeInTheDocument();
  });
});

describe("Заглушки разделов", () => {
  it.each(["/book", "/admin/event-types", "/admin/bookings"])(
    "%s сообщает, что раздел появится позже, и ведёт на Главную страницу",
    async (url) => {
      const { user } = renderAt(url);

      expect(screen.getByText(/^Скоро здесь будет/)).toBeInTheDocument();

      await user.click(screen.getByRole("link", { name: "На главную" }));

      expect(screen.getByRole("heading", { name: "Как это работает" })).toBeInTheDocument();
    },
  );
});

describe("Шапка", () => {
  it.each(["Типы встреч", "Предстоящие встречи"])("ссылка «%s» открывает раздел Владельца", async (section) => {
    const { user } = renderAt("/");

    await user.click(screen.getByRole("link", { name: section }));

    expect(screen.getByRole("heading", { level: 1, name: section })).toBeInTheDocument();
  });

  it("название сервиса возвращает на Главную страницу", async () => {
    const { user } = renderAt("/book");

    await user.click(screen.getByRole("link", { name: "Календарь звонков" }));

    expect(screen.getByRole("heading", { name: "Как это работает" })).toBeInTheDocument();
  });
});

describe("Неизвестный адрес", () => {
  it("показывает «Страница не найдена» со ссылкой на Главную страницу", async () => {
    const { user } = renderAt("/foo");

    expect(screen.getByRole("heading", { level: 1, name: "Страница не найдена" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "На главную" }));

    expect(screen.getByRole("heading", { name: "Как это работает" })).toBeInTheDocument();
  });
});
