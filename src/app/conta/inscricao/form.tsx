"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { criarPerfil, type EstadoInscricao } from "../actions";
import { Alerta, BotaoSubmeter, CAMPO, Rotulo } from "@/components/forms";
import { SITE } from "@/lib/site";

type Atividade = { id: string; nome: string };

function idade(dataIso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return null;
  const n = new Date(dataIso + "T12:00:00");
  const h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
  return i;
}

function Caixa({ name, children, defaultChecked }: { name: string; children: React.ReactNode; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl p-2 hover:bg-cinza-claro">
      <input type="checkbox" name={name} required defaultChecked={defaultChecked} className="mt-1 size-5 shrink-0 accent-verde" />
      <span>{children}</span>
    </label>
  );
}

export function InscricaoForm({ atividades, email }: { atividades: Atividade[]; email: string }) {
  const [estado, acao] = useActionState<EstadoInscricao, FormData>(criarPerfil, {});
  const c = estado.campos ?? {};
  const [nascimento, setNascimento] = useState(c.data_nascimento ?? "");
  const anos = idade(nascimento);
  const abaixoDaIdade = anos !== null && anos < SITE.idadeMinima;
  // Só pedimos o encarregado a quem PODE ser voluntário mas ainda não tem 18 anos
  const menor = anos !== null && anos >= SITE.idadeMinima && anos < 18;

  return (
    <form action={acao} className="space-y-8">
      <fieldset className="space-y-5">
        <legend className="titulo text-lg">Os teus dados</legend>
        <p className="text-tinta-suave">
          Email da conta: <strong>{email}</strong>
        </p>
        <div>
          <Rotulo htmlFor="nome">Nome</Rotulo>
          <input id="nome" name="nome" required minLength={2} maxLength={120} autoComplete="name" defaultValue={c.nome} className={CAMPO} />
        </div>
        <div>
          <Rotulo htmlFor="telefone">Telemóvel</Rotulo>
          <input id="telefone" name="telefone" required type="tel" autoComplete="tel" inputMode="tel" placeholder="912 345 678" defaultValue={c.telefone} className={CAMPO} />
        </div>
        <div>
          <Rotulo htmlFor="data_nascimento">Data de nascimento</Rotulo>
          <input
            id="data_nascimento"
            name="data_nascimento"
            type="date"
            required
            autoComplete="bday"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            className={`${CAMPO} max-w-xs`}
          />
          {abaixoDaIdade && (
            <p className="mt-2 text-sm text-erro">É preciso ter pelo menos {SITE.idadeMinima} anos para ser voluntário.</p>
          )}
        </div>
      </fieldset>

      {menor && (
        <fieldset className="space-y-5 rounded-2xl border-2 border-aviso/30 bg-amber-50 p-5 sm:p-7">
          <legend className="titulo px-2 text-lg">Encarregado de educação</legend>
          <p>Como tens menos de 18 anos, precisamos do contacto e da autorização do teu encarregado de educação.</p>
          <div>
            <Rotulo htmlFor="encarregado_nome">Nome do encarregado de educação</Rotulo>
            <input id="encarregado_nome" name="encarregado_nome" required maxLength={120} defaultValue={c.encarregado_nome} className={CAMPO} />
          </div>
          <div>
            <Rotulo htmlFor="encarregado_telefone">Telemóvel do encarregado de educação</Rotulo>
            <input id="encarregado_telefone" name="encarregado_telefone" type="tel" required inputMode="tel" defaultValue={c.encarregado_telefone} className={CAMPO} />
          </div>
          <div>
            <Rotulo htmlFor="encarregado_email" opcional>Email do encarregado de educação</Rotulo>
            <input id="encarregado_email" name="encarregado_email" type="email" defaultValue={c.encarregado_email} className={CAMPO} />
          </div>
          <Caixa name="autorizacao_encarregado">
            Declaro que o meu encarregado de educação sabe e autoriza que eu participe no voluntariado do ESTAR.
          </Caixa>
        </fieldset>
      )}

      {atividades.length > 0 && (
        <fieldset className="space-y-3">
          <legend className="titulo text-lg">Que atividades te interessam?</legend>
          {atividades.map((a) => (
            <label key={a.id} className="flex cursor-pointer gap-3 rounded-xl p-2 hover:bg-cinza-claro">
              <input type="checkbox" name="interesses" value={a.id} defaultChecked className="mt-1 size-5 shrink-0 accent-verde" />
              <span>{a.nome}</span>
            </label>
          ))}
        </fieldset>
      )}

      <fieldset className="space-y-3">
        <legend className="titulo text-lg">Para terminar</legend>
        <Caixa name="consent_privacidade">
          Li e aceito a{" "}
          <Link href="/privacidade" target="_blank" className="font-semibold text-verde underline">
            Política de Privacidade
          </Link>
          .
        </Caixa>
        <Caixa name="consent_partilha">
          Aceito que o meu nome e contacto sejam partilhados com o responsável da atividade onde for fazer voluntariado.
        </Caixa>
        <Caixa name="consent_regras">
          Comprometo-me a cumprir as{" "}
          <Link href="/atividades" target="_blank" className="font-semibold text-verde underline">
            regras das visitas
          </Link>{" "}
          (não tirar fotografias, manter a confidencialidade, avisar se não puder ir).
        </Caixa>
      </fieldset>

      {estado.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      <BotaoSubmeter pendente="A guardar…" className="w-full sm:w-auto">
        Concluir inscrição
      </BotaoSubmeter>
    </form>
  );
}
