import { PrismaClient, type EstadoParte, type TipoVisita } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, hoyKey, keyToDate } from "../lib/fechas";

const prisma = new PrismaClient();

const PIN_PRUEBA = "1234";
const ADMIN_EMAIL = "admin@controlplagas.local";
const ADMIN_PASSWORD = "admin1234";

const TIPOS_ANALISIS = [
  "Aerobios",
  "Aerobios, Hierro",
  "Análisis Legionella",
  "Análisis Legionella, Aerobios",
  "Análisis Legionella, Aerobios, Hierro",
  "Análisis Legionella, Hierro",
  "FQ",
  "POT",
  "POT+NO3",
  "PISC",
  "OTROS",
];

const TIPOS_AGUA = ["AFCH", "ACS", "FUENTE", "PCI", "RIEGO", "PISC", "TORRE REFRIGERACION"];

const TECNICOS = [
  { nombre: "Jonathan", color: "#2563eb" },
  { nombre: "Fco. Javier", color: "#16a34a" },
  { nombre: "Juan José", color: "#ea580c" },
  { nombre: "José Joaquín L.", color: "#9333ea" },
];

async function main() {
  // Limpieza (orden por dependencias)
  await prisma.auditLog.deleteMany();
  await prisma.muestra.deleteMany();
  await prisma.resultadoPdf.deleteMany();
  await prisma.parte.deleteMany();
  await prisma.contador.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.tipoAnalisis.deleteMany();
  await prisma.tipoAgua.deleteMany();
  await prisma.usuario.deleteMany();

  const admin = await prisma.usuario.create({
    data: {
      nombre: "Administración",
      rol: "ADMIN",
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      color: "#0f172a",
    },
  });

  const pinHash = await bcrypt.hash(PIN_PRUEBA, 10);
  const tecnicos: Record<string, string> = {};
  for (const t of TECNICOS) {
    const u = await prisma.usuario.create({ data: { nombre: t.nombre, rol: "TECNICO", pinHash, color: t.color } });
    tecnicos[t.nombre] = u.id;
  }

  const analisis: Record<string, string> = {};
  for (const [i, nombre] of TIPOS_ANALISIS.entries()) {
    analisis[nombre] = (await prisma.tipoAnalisis.create({ data: { nombre, orden: i + 1 } })).id;
  }
  const agua: Record<string, string> = {};
  for (const [i, nombre] of TIPOS_AGUA.entries()) {
    agua[nombre] = (await prisma.tipoAgua.create({ data: { nombre, orden: i + 1 } })).id;
  }

  const hoySeed = hoyKey();
  const hotel = await prisma.cliente.create({
    data: {
      codigo: "C-0101",
      numeroContrato: "CT-2026-014",
      // Firmado hace ~3 meses: limpieza y 1ª toma hechas, 2ª toma hoy
      fechaContrato: keyToDate(addDays(hoySeed, -100)),
      fechaRenovacion: keyToDate(addDays(hoySeed, 245)),
      nombre: "Hotel Sevilla Centro",
      direccion: "Av. de la Constitución 12",
      poblacion: "Sevilla",
      contacto: "Marta Ruiz (mantenimiento)",
      telefono: "954000111",
      email: "mantenimiento@hotelsevillacentro.example",
      notas: "Preguntar en recepción por el jefe de mantenimiento.",
    },
  });
  const residencia = await prisma.cliente.create({
    data: {
      codigo: "C-0207",
      nombre: "Residencia Los Olivos",
      direccion: "C/ Real 45",
      poblacion: "Dos Hermanas",
      contacto: "Antonio Gil",
      telefono: "955222333",
    },
  });
  const poli = await prisma.cliente.create({
    data: {
      codigo: "C-0315",
      nombre: "Polideportivo Municipal",
      direccion: "Av. del Deporte s/n",
      poblacion: "Alcalá de Guadaíra",
      contacto: "Conserjería",
      telefono: "955444555",
    },
  });
  // Mismo código: otro centro del mismo cliente
  const piscina = await prisma.cliente.create({
    data: {
      codigo: "C-0315",
      nombre: "Polideportivo Municipal – Piscina cubierta",
      direccion: "C/ Nadador 3",
      poblacion: "Alcalá de Guadaíra",
      contacto: "Socorrista de turno",
      telefono: "955444556",
    },
  });

  const hoy = hoyKey();
  const anio = Number(hoy.slice(0, 4));
  let n = 0;

  type Linea = { cantidad: number; analisis: string; agua: string };
  async function crearParte(p: {
    cliente: string;
    tecnico?: string;
    dia: number;
    pedido?: string;
    estado?: EstadoParte;
    tipoVisita?: TipoVisita;
    observaciones?: string;
    lineas: Linea[];
    tomadas?: { punto: string; temp?: number; tempAC?: number; cloro?: number; cond?: number; ph?: number }[];
  }) {
    n++;
    const fecha = addDays(hoy, p.dia);
    const muestras = p.lineas.flatMap((l) =>
      Array.from({ length: l.cantidad }, () => ({ tipoAnalisisId: analisis[l.analisis], tipoAguaId: agua[l.agua] })),
    );
    const tecnicoId = p.tecnico ? tecnicos[p.tecnico] : null;
    await prisma.parte.create({
      data: {
        numero: `P-${anio}-${String(n).padStart(4, "0")}`,
        clienteId: p.cliente,
        tecnicoId,
        fechaPrevista: keyToDate(fecha),
        numPedido: p.pedido ?? null,
        estado: p.estado ?? "PLANIFICADO",
        tipoVisita: p.tipoVisita ?? null,
        observaciones: p.observaciones ?? null,
        creadoPorId: admin.id,
        muestras: {
          create: muestras.map((m, i) => {
            const t = p.tomadas?.[i];
            return {
              ...m,
              orden: i + 1,
              referencia: `T-${i + 1}`,
              ...(t && {
                estado: "TOMADA" as const,
                puntoRecogida: t.punto,
                temperatura: t.temp ?? null,
                temperaturaAC: t.tempAC ?? null,
                cloro: t.cloro ?? null,
                conductividad: t.cond ?? null,
                ph: t.ph ?? null,
                fechaToma: keyToDate(fecha),
                horaToma: `${String(9 + i).padStart(2, "0")}:15`,
                tomadaPorId: tecnicoId,
                tomadaEn: keyToDate(fecha),
              }),
            };
          }),
        },
      },
    });
  }

  // Plan del contrato del hotel: limpieza a la firma y 1ª toma a los 20 días
  await crearParte({ cliente: hotel.id, tecnico: "Jonathan", dia: -100, estado: "VALIDADO", tipoVisita: "LIMPIEZA", lineas: [] });
  await crearParte({
    cliente: hotel.id,
    tecnico: "Jonathan",
    dia: -80,
    estado: "VALIDADO",
    tipoVisita: "TOMA_1",
    lineas: [{ cantidad: 1, analisis: "Análisis Legionella", agua: "ACS" }],
    tomadas: [{ punto: "Habitación 101 – ducha", temp: 55, cloro: 0.4 }],
  });

  // Completado hace 5 días (aparece en "Hechos" y alimenta sugerencias de puntos)
  await crearParte({
    cliente: hotel.id,
    tecnico: "Jonathan",
    dia: -5,
    pedido: "PED-0998",
    estado: "COMPLETADO",
    tipoVisita: "EXTRA",
    lineas: [
      { cantidad: 1, analisis: "Análisis Legionella, Aerobios", agua: "AFCH" },
      { cantidad: 3, analisis: "Análisis Legionella, Aerobios", agua: "ACS" },
    ],
    tomadas: [
      { punto: "Depósito", temp: 19.5, cloro: 0.6, ph: 7.4 },
      { punto: "Acumulador", temp: 61.2, tempAC: 60.8 },
      { punto: "Retorno", temp: 55.4 },
      { punto: "PTR 12", temp: 52.1, tempAC: 51.9 },
    ],
  });
  // Atrasado: hace 2 días, empezado y sin terminar
  await crearParte({
    cliente: residencia.id,
    tecnico: "Jonathan",
    dia: -2,
    pedido: "PED-1010",
    estado: "EN_CURSO",
    lineas: [
      { cantidad: 1, analisis: "Análisis Legionella", agua: "AFCH" },
      { cantidad: 2, analisis: "Análisis Legionella", agua: "ACS" },
    ],
    tomadas: [{ punto: "Depósito", temp: 18.9, cloro: 0.4 }],
  });
  // Hoy
  await crearParte({
    cliente: hotel.id,
    tecnico: "Jonathan",
    dia: 0,
    pedido: "PED-1023",
    tipoVisita: "TOMA_2",
    observaciones: "Visita trimestral. Llevar 8 frascos estériles.",
    lineas: [
      { cantidad: 2, analisis: "Análisis Legionella, Aerobios", agua: "AFCH" },
      { cantidad: 6, analisis: "Análisis Legionella, Aerobios", agua: "ACS" },
    ],
  });
  await crearParte({
    cliente: residencia.id,
    tecnico: "Jonathan",
    dia: 0,
    lineas: [
      { cantidad: 1, analisis: "Análisis Legionella", agua: "TORRE REFRIGERACION" },
      { cantidad: 2, analisis: "Aerobios", agua: "ACS" },
    ],
  });
  // Próximos días
  await crearParte({
    cliente: piscina.id,
    tecnico: "Jonathan",
    dia: 1,
    pedido: "PED-1031",
    lineas: [{ cantidad: 3, analisis: "PISC", agua: "PISC" }],
  });
  await crearParte({
    cliente: poli.id,
    tecnico: "Jonathan",
    dia: 3,
    lineas: [
      { cantidad: 2, analisis: "POT", agua: "FUENTE" },
      { cantidad: 1, analisis: "Análisis Legionella", agua: "RIEGO" },
    ],
  });
  await crearParte({
    cliente: poli.id,
    tecnico: "Fco. Javier",
    dia: 2,
    lineas: [{ cantidad: 4, analisis: "POT", agua: "FUENTE" }],
  });
  await crearParte({
    cliente: hotel.id,
    tecnico: "Juan José",
    dia: 4,
    lineas: [{ cantidad: 2, analisis: "FQ", agua: "PCI" }],
  });
  // Sin asignar
  await crearParte({
    cliente: residencia.id,
    dia: 6,
    lineas: [{ cantidad: 3, analisis: "Análisis Legionella, Aerobios, Hierro", agua: "ACS" }],
  });

  await prisma.contador.create({ data: { anio, ultimo: n } });

  console.log(`Seed OK (${hoy}). Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}. Técnicos: PIN ${PIN_PRUEBA}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
