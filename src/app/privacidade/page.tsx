import type { Metadata } from "next";
import { Container, PageHeader, Section } from "@/components/ui";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o ESTAR trata os dados pessoais dos voluntários.",
};

export default function Privacidade() {
  return (
    <>
      <PageHeader titulo="Política de Privacidade" subtitulo="Em linguagem simples." />
      <Section>
        <Container narrow className="prosa">
          {/* RASCUNHO: rever com a paróquia antes de o site ser público. */}
          <p className="rounded-2xl bg-cinza p-4 text-sm">
            <strong>Rascunho.</strong> Este texto ainda vai ser revisto pela equipa e pela paróquia antes de o
            site abrir ao público.
          </p>

          <h2>Quem somos</h2>
          <p>
            O responsável pelo tratamento dos teus dados é o {SITE.organizacao} (projeto ESTAR). Podes contactar-nos em{" "}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
          </p>

          <h2>Que dados recolhemos</h2>
          <ul>
            <li>Nome, email e telefone.</li>
            <li>Data de nascimento (para confirmar a idade mínima de {SITE.idadeMinima} anos).</li>
            <li>Se tiveres menos de 18 anos: nome e contactos do teu encarregado de educação e a declaração de autorização.</li>
            <li>As atividades que te interessam e as tuas disponibilidades.</li>
            <li>As visitas em que participas e, se as enviares, os testemunhos.</li>
          </ul>
          <p>Não recolhemos dados de saúde nem outros dados sensíveis.</p>

          <h2>Para que usamos os dados</h2>
          <ul>
            <li>Organizar as visitas e distribuir os voluntários.</li>
            <li>Enviar-te confirmações e lembretes das visitas.</li>
            <li>Falar contigo, se for preciso, sobre o voluntariado.</li>
            <li>Publicar o teu testemunho, mas só se nos autorizares e depois de o revermos.</li>
          </ul>

          <h2>Quem vê os teus dados</h2>
          <ul>
            <li>Os administradores do ESTAR, que organizam o voluntariado.</li>
            <li>Os responsáveis do local onde fores fazer a visita, que recebem o teu nome e contacto para poderem organizar a visita. Só os recebem se aceitares isto na inscrição.</li>
            <li>Os prestadores de serviços técnicos que fazem o site funcionar (alojamento, base de dados e envio de email), dentro da União Europeia sempre que possível.</li>
          </ul>
          <p>Não vendemos nem cedemos os teus dados para publicidade.</p>

          <h2>Fotografias</h2>
          <p>
            Não publicamos fotografias das atividades nem de quem visitamos. Pedimos também aos voluntários que
            não tirem fotografias durante as visitas.
          </p>

          <h2>Quanto tempo guardamos os dados</h2>
          <p>
            Enquanto fores voluntário. Se estiveres inativo há mais de 24 meses, os teus dados são anonimizados
            ou apagados. Podes pedir antes a eliminação, quando quiseres.
          </p>

          <h2>Os teus direitos</h2>
          <p>
            Podes pedir para ver, corrigir, descarregar ou apagar os teus dados, e retirar o teu consentimento
            a qualquer momento. Escreve-nos para <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Também
            podes apresentar uma reclamação à Comissão Nacional de Proteção de Dados (
            <a href="https://www.cnpd.pt" rel="noopener noreferrer">
              cnpd.pt
            </a>
            ).
          </p>

          <h2>Cookies</h2>
          <p>
            Usamos apenas os cookies necessários para manteres a sessão iniciada. Não usamos cookies de
            publicidade nem de análise.
          </p>
        </Container>
      </Section>
    </>
  );
}
