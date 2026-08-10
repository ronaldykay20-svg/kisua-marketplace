import { X, BookOpen } from "lucide-react";

interface ManualSection {
  heading: string;
  body: string[];
}

interface Manual {
  title: string;
  intro: string;
  sections: ManualSection[];
}

// Manuais de instrução por aba — escritos para quem está a usar o painel
// pela primeira vez. Cada aba do Gestor de Marketing tem o seu manual
// completo; as restantes abas ainda não têm (aparece uma mensagem simples).
export const TAB_MANUALS: Record<string, Manual> = {
  analytics: {
    title: "Analytics",
    intro:
      "Aqui vês, em números, como a Zangu está a ser usada: visitas, sessões, e o que mais chama a atenção dos compradores.",
    sections: [
      {
        heading: "Para que serve",
        body: [
          "Mostra visitas e sessões da app num período que escolhes (7, 30, 90 dias).",
          "Ajuda-te a perceber se uma campanha, banner ou promoção está a ter efeito real — compara o antes e o depois de a publicares.",
        ],
      },
      {
        heading: "Como usar",
        body: [
          "Escolhe o período no topo da página.",
          "Os gráficos atualizam sozinhos — não precisas de guardar nada aqui, é só consulta.",
        ],
      },
      {
        heading: "Dica",
        body: [
          "Usa esta aba ANTES de lançares um banner ou promoção nova, para teres um número de referência do que é \"normal\" — assim consegues medir o impacto a sério depois.",
        ],
      },
    ],
  },
  interacoes: {
    title: "Interações",
    intro: "Mostra o que as pessoas mais tocam, clicam e visitam dentro da app — onde estão a prestar atenção.",
    sections: [
      {
        heading: "Para que serve",
        body: [
          "Vês quais páginas, categorias ou produtos têm mais cliques e visitas.",
          "É a melhor forma de decidir ONDE vale a pena pôr um banner ou destaque — nos sítios que já têm mais gente a passar.",
        ],
      },
      {
        heading: "Como usar",
        body: [
          "Escolhe o período no topo, tal como em Analytics.",
          "Repara nos itens no topo da lista — são os que estão a gerar mais interesse agora.",
        ],
      },
    ],
  },
  banners: {
    title: "Banners",
    intro: "Os banners são as imagens grandes que aparecem no início da app — a primeira coisa que o comprador vê.",
    sections: [
      {
        heading: "Para que serve",
        body: [
          "Criar, editar, ativar/desativar e ordenar os banners da página inicial.",
          "Podes definir título, subtítulo, texto do botão, link de destino, imagem e cores.",
        ],
      },
      {
        heading: "Como criar um banner",
        body: [
          "Clica em \"Novo banner\", escolhe o formato (inteiro ou dividido), envia a imagem, escreve o texto e o link para onde deve levar ao ser tocado.",
          "Usa \"sort_order\" (ordem) para decidir qual aparece primeiro — quanto menor o número, mais cedo aparece.",
          "Desativa um banner (em vez de apagar) quando quiseres pará-lo temporariamente — assim podes voltar a ativá-lo depois sem teres de o refazer.",
        ],
      },
      {
        heading: "Importante",
        body: [
          "Cada alteração que fazes aqui fica registada e é enviada para o Admin confirmar — o banner já fica ativo na hora, isto é só para haver sempre um registo do que mudou e quando.",
        ],
      },
    ],
  },
  publicidade: {
    title: "Publicidade",
    intro: "Gere os anúncios/publicidade que aparecem espalhados pela app (não são os banners do topo).",
    sections: [
      {
        heading: "Para que serve",
        body: [
          "Criar anúncios com imagem ou vídeo, escolher onde aparecem, e ativar ou desativar cada um.",
        ],
      },
      {
        heading: "Como usar",
        body: [
          "Escolhe o tipo de conteúdo, envia o ficheiro, define o link de destino (para onde vai a pessoa que tocar no anúncio).",
          "Podes desativar um anúncio a qualquer momento sem o apagar — fica guardado para reativares mais tarde.",
        ],
      },
    ],
  },
  cupons: {
    title: "Cupões",
    intro: "Cria e gere os cupões de desconto usados em toda a plataforma (cupões da Zangu, não dos vendedores).",
    sections: [
      {
        heading: "Para que serve",
        body: [
          "Criar códigos de desconto (percentagem ou valor fixo), com data de validade e limite de utilizações.",
          "Escolher se um cupão aparece no popup de boas-vindas a novos utilizadores.",
        ],
      },
      {
        heading: "Como criar um cupão",
        body: [
          "Define o código (o que a pessoa escreve no checkout), o desconto, e até quando é válido.",
          "Ativa \"mostrar no popup de boas-vindas\" se quiseres que apareça automaticamente a quem está a usar a Zangu pela primeira vez.",
        ],
      },
      {
        heading: "Importante",
        body: [
          "Cupões com desconto muito alto reduzem a margem de todos os vendedores — usa com critério, sobretudo em produtos com desconto de dropshipper.",
        ],
      },
    ],
  },
  leiloes: {
    title: "Leilões",
    intro: "Gere a secção de leilões da Zangu: destaque da página, e os métodos de pagamento aceites para dar lances.",
    sections: [
      {
        heading: "Para que serve",
        body: [
          "Definir a imagem de destaque (hero) da página de leilões.",
          "Adicionar ou desativar os métodos de pagamento que as pessoas podem usar para pagar leilões ganhos.",
        ],
      },
      {
        heading: "Como usar",
        body: [
          "Envia uma imagem de destaque atrativa — é a primeira coisa que quem visita a página de leilões vê.",
          "Em métodos de pagamento, mantém sempre pelo menos uma opção ativa, ou ninguém consegue pagar um leilão ganho.",
        ],
      },
    ],
  },
};

interface Props {
  tabKey: string;
  onClose: () => void;
}

export default function TabManualModal({ tabKey, onClose }: Props) {
  const manual = TAB_MANUALS[tabKey];

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-black text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Manual — {manual?.title || tabKey}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!manual ? (
          <p className="text-xs text-muted-foreground mt-3">
            Ainda não há um manual escrito para esta aba.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mt-2 mb-4">{manual.intro}</p>
            <div className="space-y-4">
              {manual.sections.map((s, i) => (
                <div key={i}>
                  <p className="text-[11px] font-black text-primary uppercase tracking-wide mb-1">{s.heading}</p>
                  <ul className="space-y-1.5">
                    {s.body.map((line, j) => (
                      <li key={j} className="text-xs text-foreground/90 flex gap-1.5">
                        <span className="text-primary">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
