"use client";

import { FormEvent, useState } from "react";

type Turno = {
  id: number;
  nombrePaciente: string;
  especialidad: string;
  fecha: string;
  confirmado: boolean;
};

type FormularioTurno = Omit<Turno, "id">;

const apiInicial =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/turnos";

const nuevoTurno = (): FormularioTurno => ({
  nombrePaciente: "",
  especialidad: "",
  fecha: "",
  confirmado: false,
});

export default function Home() {
  const [apiUrl, setApiUrl] = useState(apiInicial);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [formulario, setFormulario] = useState<FormularioTurno>(nuevoTurno);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("Conectá tu API y cargá los turnos.");

  const url = () => apiUrl.replace(/\/$/, "");

  async function leerError(respuesta: Response) {
    const contenido = await respuesta.text();
    try {
      const json = JSON.parse(contenido) as { message?: string; title?: string };
      return json.message ?? json.title ?? contenido;
    } catch {
      return contenido || `Error ${respuesta.status}`;
    }
  }

  async function cargarTurnos() {
    setCargando(true);
    setMensaje("");
    try {
      const respuesta = await fetch(url());
      if (!respuesta.ok) throw new Error(await leerError(respuesta));
      const datos = (await respuesta.json()) as Turno[];
      setTurnos(datos);
      setMensaje(`${datos.length} turno${datos.length === 1 ? "" : "s"} cargado${datos.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMensaje(`No se pudieron cargar los turnos: ${error instanceof Error ? error.message : "error de conexión"}`);
    } finally {
      setCargando(false);
    }
  }

  function actualizarCampo<K extends keyof FormularioTurno>(campo: K, valor: FormularioTurno[K]) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardarTurno(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setMensaje("");
    const esEdicion = editandoId !== null;

    try {
      const respuesta = await fetch(esEdicion ? `${url()}/${editandoId}` : url(), {
        method: esEdicion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formulario,
          fecha: new Date(formulario.fecha).toISOString(),
        }),
      });
      if (!respuesta.ok) throw new Error(await leerError(respuesta));
      setFormulario(nuevoTurno());
      setEditandoId(null);
      setMensaje(esEdicion ? "Turno actualizado correctamente." : "Turno creado correctamente.");
      await cargarTurnos();
    } catch (error) {
      setMensaje(`No se pudo guardar el turno: ${error instanceof Error ? error.message : "error de conexión"}`);
    } finally {
      setGuardando(false);
    }
  }

  function editarTurno(turno: Turno) {
    setEditandoId(turno.id);
    setFormulario({
      nombrePaciente: turno.nombrePaciente,
      especialidad: turno.especialidad,
      fecha: turno.fecha.slice(0, 16),
      confirmado: turno.confirmado,
    });
    setMensaje(`Editando el turno de ${turno.nombrePaciente}.`);
  }

  async function eliminarTurno(turno: Turno) {
    if (!window.confirm(`¿Eliminar el turno de ${turno.nombrePaciente}?`)) return;
    try {
      const respuesta = await fetch(`${url()}/${turno.id}`, { method: "DELETE" });
      if (!respuesta.ok) throw new Error(await leerError(respuesta));
      setMensaje("Turno eliminado correctamente.");
      await cargarTurnos();
    } catch (error) {
      setMensaje(`No se pudo eliminar el turno: ${error instanceof Error ? error.message : "error de conexión"}`);
    }
  }

  return (
    <main className="pagina">
      <header className="encabezado">
        <p className="etiqueta">CONSULTORIO MÉDICO</p>
        <h1>Gestión de turnos</h1>
        <p>Ejemplo de consumo de la API <code>/api/turnos</code>.</p>
      </header>

      <section className="conexion" aria-label="Configuración de la API">
        <label htmlFor="api-url">URL de la API</label>
        <input id="api-url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
        <button type="button" className="secundario" onClick={() => void cargarTurnos()} disabled={cargando}>
          {cargando ? "Cargando..." : "Recargar"}
        </button>
      </section>

      <p className="mensaje" role="status">{mensaje}</p>

      <div className="contenido">
        <section className="tarjeta formulario">
          <div className="titulo-seccion">
            <h2>{editandoId === null ? "Nuevo turno" : "Editar turno"}</h2>
            {editandoId !== null && <button type="button" className="enlace" onClick={() => { setEditandoId(null); setFormulario(nuevoTurno()); }}>Cancelar</button>}
          </div>
          <form onSubmit={guardarTurno}>
            <label htmlFor="paciente">Nombre del paciente</label>
            <input id="paciente" required value={formulario.nombrePaciente} onChange={(e) => actualizarCampo("nombrePaciente", e.target.value)} />

            <label htmlFor="especialidad">Especialidad</label>
            <input id="especialidad" required placeholder="Ej.: Cardiología" value={formulario.especialidad} onChange={(e) => actualizarCampo("especialidad", e.target.value)} />

            <label htmlFor="fecha">Fecha y hora</label>
            <input id="fecha" type="datetime-local" required min={new Date().toISOString().slice(0, 16)} value={formulario.fecha} onChange={(e) => actualizarCampo("fecha", e.target.value)} />

            <label className="check"><input type="checkbox" checked={formulario.confirmado} onChange={(e) => actualizarCampo("confirmado", e.target.checked)} /> Turno confirmado</label>
            <button className="principal" disabled={guardando}>{guardando ? "Guardando..." : editandoId === null ? "Crear turno" : "Guardar cambios"}</button>
          </form>
        </section>

        <section className="tarjeta listado">
          <div className="titulo-seccion"><h2>Turnos registrados</h2><span>{turnos.length}</span></div>
          {turnos.length === 0 ? <p className="vacio">No hay turnos para mostrar.</p> : (
            <ul>
              {turnos.map((turno) => (
                <li key={turno.id}>
                  <div><strong>{turno.nombrePaciente}</strong><p>{turno.especialidad} · {new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(turno.fecha))}</p></div>
                  <div className="acciones"><span className={turno.confirmado ? "estado confirmado" : "estado pendiente"}>{turno.confirmado ? "Confirmado" : "Pendiente"}</span><button type="button" className="enlace" onClick={() => editarTurno(turno)}>Editar</button><button type="button" className="peligro" onClick={() => void eliminarTurno(turno)}>Eliminar</button></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
