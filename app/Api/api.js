const URL = "https://localhost:7156";
export const testConection = async () => {
  const response = await fetch(`${URL}/turnos`).then((res) => res.json());

  return response;
};
