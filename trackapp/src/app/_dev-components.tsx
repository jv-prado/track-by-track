import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Heart, Music } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { GenreFilter } from "@/components/ui/GenreFilter";
import { Modal } from "@/components/ui/Modal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Pagination } from "@/components/ui/Pagination";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { StatCard } from "@/components/ui/StatCard";
import { TextArea } from "@/components/ui/TextArea";
import { SpotifyIcon, YoutubeIcon, AppleMusicIcon } from "@/components/ui/BrandIcon";
import { toast } from "@/components/ui/toast-store";
import { colors } from "@/lib/colors";

/**
 * Fase 3 (trackapp/plan.md) — QA visual de todos os 19 componentes de
 * `components/ui/` lado a lado, pra comparar 1:1 com o web antes de dar a
 * fase por pronta. Não é tela do produto — remover quando não precisar mais.
 */
export default function DevComponentsScreen() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [genre, setGenre] = useState<string | undefined>();
  const [page, setPage] = useState(2);

  return (
    <ScrollView className="flex-1 bg-grafite" contentContainerClassName="gap-6 p-4 pt-16 pb-24">
      <Text className="text-white" style={{ fontFamily: "SFProDisplay-Bold", fontSize: 22 }}>
        Design system — QA
      </Text>

      <Section title="Button">
        <View className="flex-row flex-wrap gap-2">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button isLoading>Loading</Button>
          <Button disabled>Disabled</Button>
        </View>
      </Section>

      <Section title="Card + StatCard">
        <Card>
          <Text className="text-white">Card padrão</Text>
        </Card>
        <View className="mt-2 flex-row gap-2">
          <StatCard icon={<Heart size={18} color={colors.dourado} />} value="128" label="Curtidas" accent="dourado" />
          <StatCard icon={<Music size={18} color={colors.roxoVivo} />} value="42" label="Álbuns" accent="roxo" />
        </View>
      </Section>

      <Section title="ProgressBar">
        <ProgressBar value={65} />
      </Section>

      <Section title="Skeleton">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-10 w-1/2" />
      </Section>

      <Section title="Spinner">
        <Spinner />
      </Section>

      <Section title="TextArea">
        <TextArea placeholder="Escreva sua review..." />
      </Section>

      <Section title="EmptyState">
        <EmptyState title="Nada por aqui" description="Quando algo existir, aparece aqui." />
      </Section>

      <Section title="ErrorState">
        <ErrorState message="Erro ao carregar." onRetry={() => toast.success("Retry!")} />
      </Section>

      <Section title="Pagination">
        <Pagination page={page} totalPages={5} onPageChange={setPage} />
      </Section>

      <Section title="GenreFilter / Select">
        <GenreFilter value={genre} onChange={setGenre} genres={["rock", "hip-hop", "mpb"]} />
      </Section>

      <Section title="BrandIcon">
        <View className="flex-row gap-3">
          <SpotifyIcon size={24} color={colors.branco} />
          <YoutubeIcon size={24} color={colors.branco} />
          <AppleMusicIcon size={24} color={colors.branco} />
        </View>
      </Section>

      <Section title="Modal">
        <Button onPress={() => setModalOpen(true)}>Abrir Modal</Button>
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Confirmar ação"
          description="Isso não pode ser desfeito."
          footer={
            <>
              <Button variant="ghost" onPress={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onPress={() => setModalOpen(false)}>
                Confirmar
              </Button>
            </>
          }
        >
          <Text className="text-gray-300">Conteúdo do modal.</Text>
        </Modal>
      </Section>

      <Section title="BottomSheet">
        <Button onPress={() => setSheetOpen(true)}>Abrir BottomSheet</Button>
        <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Opções">
          <Text className="text-gray-300">Arraste o header pra fechar.</Text>
        </BottomSheet>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2 border-b border-white/5 pb-6">
      <Text className="text-sm font-semibold text-dourado">{title}</Text>
      {children}
    </View>
  );
}
