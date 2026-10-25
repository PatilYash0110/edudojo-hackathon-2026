'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  PanelLeftClose,
  PieChart,
  Cpu,
  MousePointer2,
  BookOpen,
  Globe,
  AlertCircle,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlideThumbnail } from '@/components/slide-renderer/SlideThumbnail';
import { ThumbnailInteractive } from '@/components/slide-renderer/components/ThumbnailInteractive';
import { useStageStore, useCanvasStore } from '@/lib/store';
import { useI18n } from '@/lib/hooks/use-i18n';
import { useNearViewport } from '@/lib/hooks/use-near-viewport';
import type { SceneType, SlideContent, InteractiveContent } from '@/lib/types/stage';
import { PENDING_SCENE_ID } from '@/lib/store/stage';

interface SceneSidebarProps {
  readonly collapsed: boolean;
  readonly onCollapseChange: (collapsed: boolean) => void;
  readonly onSceneSelect?: (sceneId: string) => void;
  readonly onRetryOutline?: (outlineId: string) => Promise<void>;
  readonly isCourseComplete?: boolean;
}

const DEFAULT_WIDTH = 220;
const MIN_WIDTH = 170;
const MAX_WIDTH = 400;

export function SceneSidebar({
  collapsed,
  onCollapseChange,
  onSceneSelect,
  onRetryOutline,
  isCourseComplete,
}: SceneSidebarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { scenes, currentSceneId, setCurrentSceneId, generatingOutlines, generationStatus } =
    useStageStore();
  const failedOutlines = useStageStore.use.failedOutlines();
  const generationInterrupted = useStageStore.use.generationInterrupted();
  const viewportSize = useCanvasStore.use.viewportSize();
  const viewportRatio = useCanvasStore.use.viewportRatio();

  const [retryingOutlineId, setRetryingOutlineId] = useState<string | null>(null);

  const handleRetryOutline = async (outlineId: string) => {
    if (!onRetryOutline) return;
    setRetryingOutlineId(outlineId);
    try {
      await onRetryOutline(outlineId);
    } finally {
      setRetryingOutlineId(null);
    }
  };

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const isDraggingRef = useRef(false);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const handleMouseMove = (me: MouseEvent) => {
        const delta = me.clientX - startX;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
        setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [sidebarWidth],
  );

  const getSceneTypeIcon = (type: SceneType) => {
    const icons = {
      slide: BookOpen,
      quiz: PieChart,
      interactive: MousePointer2,
      pbl: Cpu,
    };
    return icons[type] || BookOpen;
  };

  const displayWidth = collapsed ? 0 : sidebarWidth;

  return (
    <div
      style={{
        width: displayWidth,
        transition: isDraggingRef.current ? 'none' : 'width 0.3s ease',
      }}
      className={cn(
        // Below md the stage has no room to give: the rail floats over it
        // instead of squeezing it, and its toggle still opens and closes it.
        'bg-sidebar/85 backdrop-blur-sm border-r border-border flex flex-col shrink-0 z-20 relative overflow-visible',
        'max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-xl',
      )}
    >
      {/* Drag handle */}
      {!collapsed && (
        <div
          onMouseDown={handleDragStart}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 group hover:bg-primary/25 active:bg-primary/40 transition-colors"
        >
          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-border group-hover:bg-primary transition-colors" />
        </div>
      )}

      <div className={cn('flex flex-col w-full h-full overflow-hidden', collapsed && 'hidden')}>
        {/* Logo Header */}
        <div className="h-10 flex items-center justify-between shrink-0 relative mt-3 mb-1 px-3">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 cursor-pointer rounded-sm px-1.5 -mx-1.5 py-1 -my-1 hover:bg-accent active:scale-[0.97] transition-all duration-150"
            title={t('generation.backToHome')}
          >
            <img src="/logo-horizontal.png" alt="" className="h-6 w-auto object-contain" />
            <span className="font-serif text-sm font-bold leading-none tracking-wide text-foreground">
              EduDojo
            </span>
          </button>
          <button
            onClick={() => onCollapseChange(true)}
            className="w-7 h-7 shrink-0 rounded-sm flex items-center justify-center bg-muted/60 text-muted-foreground ring-1 ring-border/60 hover:bg-accent hover:text-foreground active:scale-90 transition-all duration-200"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Scenes List */}
        <div
          data-testid="scene-list"
          className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2 scrollbar-hide pt-1"
        >
          {scenes.map((scene, index) => {
            const isActive = currentSceneId === scene.id;
            const Icon = getSceneTypeIcon(scene.type);
            const isSlide = scene.type === 'slide';
            const isInteractive = scene.type === 'interactive';
            const slideContent = isSlide ? (scene.content as SlideContent) : null;
            const interactiveContent = isInteractive ? (scene.content as InteractiveContent) : null;

            return (
              <div
                key={scene.id}
                data-testid="scene-item"
                onClick={() => {
                  if (onSceneSelect) {
                    onSceneSelect(scene.id);
                  } else {
                    setCurrentSceneId(scene.id);
                  }
                }}
                className={cn(
                  'group relative rounded-sm transition-all duration-200 cursor-pointer flex flex-col gap-1 p-1.5',
                  isActive ? 'bg-accent ring-1 ring-primary/45' : 'hover:bg-accent/55',
                )}
              >
                {/* Scene Header */}
                <div className="flex justify-between items-center px-2 pt-0.5">
                  <div className="flex items-center gap-2 max-w-full">
                    <span
                      className={cn(
                        'font-serif text-[10px] font-bold w-4 h-4 rounded-[2px] flex items-center justify-center shrink-0 tabular-nums',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span
                      data-testid="scene-title"
                      className={cn(
                        'text-xs font-semibold truncate transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-foreground/75 group-hover:text-foreground',
                      )}
                    >
                      {scene.title}
                    </span>
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="relative aspect-video w-full rounded-[2px] overflow-hidden bg-muted ring-1 ring-border/60">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isSlide && slideContent ? (
                      <LazySlideThumbnail
                        slide={slideContent.canvas}
                        sceneId={scene.id}
                        viewportSize={viewportSize}
                        viewportRatio={viewportRatio}
                        size={Math.max(100, sidebarWidth - 28)}
                      />
                    ) : scene.type === 'quiz' ? (
                      /* Quiz: question bar + 2x2 option grid */
                      <div className="w-full h-full bg-[color-mix(in_oklab,var(--shu)_8%,var(--card))] p-2 flex flex-col">
                        <div className="h-1.5 w-4/5 bg-primary/25 rounded-full mb-1.5" />
                        <div className="flex-1 grid grid-cols-2 gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                'rounded flex items-center gap-1 px-1',
                                i === 1
                                  ? 'bg-primary/20 border border-primary/35'
                                  : 'bg-card/70 border border-border/50',
                              )}
                            >
                              <div
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full shrink-0',
                                  i === 1 ? 'bg-primary' : 'bg-primary/30',
                                )}
                              />
                              <div
                                className={cn(
                                  'h-1 rounded-full flex-1',
                                  i === 1 ? 'bg-primary/45' : 'bg-primary/20',
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : scene.type === 'interactive' && interactiveContent?.html ? (
                      /* Interactive: live iframe preview */
                      <ThumbnailInteractive
                        content={interactiveContent}
                        size={Math.max(100, sidebarWidth - 28)}
                      />
                    ) : scene.type === 'interactive' ? (
                      /* Interactive: browser window with chrome + content */
                      <div className="w-full h-full bg-[color-mix(in_oklab,var(--wood)_10%,var(--card))] p-1.5 flex flex-col">
                        <div className="flex items-center gap-1 mb-1 pb-1 border-b border-[var(--wood)]/25">
                          <div className="flex gap-0.5">
                            <div className="w-1 h-1 rounded-full bg-primary/60" />
                            <div className="w-1 h-1 rounded-full bg-[var(--gold)]/70" />
                            <div className="w-1 h-1 rounded-full bg-[var(--wood)]/50" />
                          </div>
                          <div className="h-1.5 flex-1 bg-[var(--wood)]/25 rounded-full ml-0.5" />
                        </div>
                        <div className="flex-1 flex gap-1">
                          <div className="w-1/4 space-y-1 pt-0.5">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-0.5 w-full bg-[var(--wood)]/30 rounded-full"
                              />
                            ))}
                          </div>
                          <div className="flex-1 bg-[var(--wood)]/10 rounded-[2px] flex items-center justify-center border border-[var(--wood)]/25">
                            <Globe className="w-4 h-4 text-[var(--wood)]/60" />
                          </div>
                        </div>
                      </div>
                    ) : scene.type === 'pbl' ? (
                      /* PBL: kanban board with 3 columns */
                      <div className="w-full h-full bg-[color-mix(in_oklab,var(--gold)_12%,var(--card))] p-1.5 flex flex-col">
                        <div className="flex items-center gap-1 mb-1.5">
                          <div className="w-1.5 h-1.5 rounded-[1px] bg-[var(--gold)]" />
                          <div className="h-1 w-8 bg-[var(--gold)]/40 rounded-full" />
                        </div>
                        <div className="flex-1 flex gap-1 overflow-hidden">
                          {[0, 1, 2].map((col) => (
                            <div
                              key={col}
                              className="flex-1 bg-card/60 rounded-[2px] p-0.5 flex flex-col gap-0.5"
                            >
                              <div
                                className={cn(
                                  'h-0.5 w-3 rounded-full mb-0.5',
                                  col === 0
                                    ? 'bg-primary/60'
                                    : col === 1
                                      ? 'bg-[var(--gold)]/80'
                                      : 'bg-[var(--wood)]/55',
                                )}
                              />
                              {Array.from({
                                length: col === 0 ? 3 : col === 1 ? 2 : 1,
                              }).map((_, i) => (
                                <div
                                  key={i}
                                  className="h-2 w-full bg-[var(--gold)]/15 rounded-[1px] border border-[var(--gold)]/25"
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Fallback */
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground/70">
                        <Icon className="w-4 h-4" />
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">
                          {scene.type}
                        </span>
                      </div>
                    )}

                    {isSlide && (
                      <div
                        className={cn(
                          'absolute inset-0 transition-colors',
                          isActive ? '' : 'group-hover:bg-foreground/5',
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Single placeholder for the next generating page (clickable) */}
          {generatingOutlines.length > 0 &&
            (() => {
              const outline = generatingOutlines[0];
              const isFailed =
                generationInterrupted || failedOutlines.some((f) => f.id === outline.id);
              const isRetrying = retryingOutlineId === outline.id;
              const isPaused = generationStatus === 'paused';
              const isActive = currentSceneId === PENDING_SCENE_ID;

              return (
                <div
                  key={`generating-${outline.id}`}
                  onClick={() => {
                    if (isFailed) return;
                    if (onSceneSelect) {
                      onSceneSelect(PENDING_SCENE_ID);
                    } else {
                      setCurrentSceneId(PENDING_SCENE_ID);
                    }
                  }}
                  className={cn(
                    'group relative rounded-sm flex flex-col gap-1 p-1.5 transition-all duration-200',
                    isFailed ? 'opacity-100 cursor-default' : 'cursor-pointer hover:bg-accent/55',
                    !isFailed && !isActive && 'opacity-60',
                    isActive && !isFailed && 'bg-accent ring-1 ring-primary/45 opacity-100',
                  )}
                >
                  {/* Scene Header */}
                  <div className="flex justify-between items-center px-2 pt-0.5">
                    <div className="flex items-center gap-2 max-w-full">
                      <span
                        className={cn(
                          'font-serif text-[10px] font-bold w-4 h-4 rounded-[2px] flex items-center justify-center shrink-0 tabular-nums',
                          isActive && !isFailed
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {scenes.length + 1}
                      </span>
                      <span
                        className={cn(
                          'text-xs font-semibold truncate transition-colors',
                          isActive && !isFailed
                            ? 'text-primary'
                            : isFailed
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                        )}
                      >
                        {outline.title}
                      </span>
                    </div>
                  </div>

                  {/* Skeleton Thumbnail */}
                  <div
                    className={cn(
                      'relative aspect-video w-full rounded-[2px] overflow-hidden ring-1',
                      isFailed ? 'bg-destructive/8 ring-destructive/25' : 'bg-muted ring-border/60',
                    )}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                      {isFailed ? (
                        <div className="flex items-center gap-1 text-xs font-medium text-destructive">
                          {onRetryOutline && !generationInterrupted ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryOutline(outline.id);
                              }}
                              disabled={isRetrying}
                              className="p-1 -ml-1 rounded-sm hover:bg-destructive/12 transition-colors active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                              title={t('generation.retryScene')}
                            >
                              <RefreshCw
                                className={cn('w-3.5 h-3.5', isRetrying && 'animate-spin')}
                              />
                            </button>
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isRetrying
                              ? t('generation.retryingScene')
                              : generationInterrupted
                                ? t('stage.generationInterrupted')
                                : t('stage.generationFailed')}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div
                            className={cn(
                              'h-2 w-3/5 bg-border/70 rounded-[2px]',
                              !isPaused && 'animate-pulse',
                            )}
                          />
                          <div
                            className={cn(
                              'h-1.5 w-2/5 bg-border/70 rounded-[2px]',
                              !isPaused && 'animate-pulse',
                            )}
                          />
                          <span className="text-[9px] font-medium text-muted-foreground mt-0.5">
                            {isPaused ? t('stage.paused') : t('stage.generating')}
                          </span>
                        </>
                      )}
                    </div>
                    {!isFailed && !isPaused && (
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-card/70 to-transparent" />
                    )}
                  </div>
                </div>
              );
            })()}

          {/* Course-complete placeholder (shown when outline is exhausted) */}
          {isCourseComplete &&
            generatingOutlines.length === 0 &&
            (() => {
              const isActive = currentSceneId === PENDING_SCENE_ID;
              return (
                <div
                  key="course-complete-slot"
                  onClick={() => {
                    if (onSceneSelect) {
                      onSceneSelect(PENDING_SCENE_ID);
                    } else {
                      setCurrentSceneId(PENDING_SCENE_ID);
                    }
                  }}
                  className={cn(
                    'group relative rounded-sm flex flex-col gap-1 p-1.5 transition-all duration-200 cursor-pointer hover:bg-[var(--gold)]/10',
                    !isActive && 'opacity-80',
                    isActive && 'bg-[var(--gold)]/15 ring-1 ring-[var(--gold)]/50 opacity-100',
                  )}
                >
                  <div className="flex justify-between items-center px-2 pt-0.5">
                    <div className="flex items-center gap-2 max-w-full">
                      <span
                        className={cn(
                          'font-serif text-[10px] font-bold w-4 h-4 rounded-[2px] flex items-center justify-center shrink-0 tabular-nums',
                          isActive
                            ? 'bg-[var(--gold)] text-[var(--sumi)]'
                            : 'bg-[var(--gold)]/20 text-[var(--wood)]',
                        )}
                      >
                        {scenes.length + 1}
                      </span>
                      <span
                        className={cn(
                          'text-xs font-semibold truncate transition-colors text-[var(--wood)]',
                        )}
                      >
                        {t('stage.courseComplete')}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'relative aspect-video w-full rounded-[2px] overflow-hidden ring-1 flex items-center justify-center transition-all',
                      'bg-[color-mix(in_oklab,var(--gold)_12%,var(--card))]',
                      isActive ? 'ring-[var(--gold)]/60' : 'ring-[var(--gold)]/30',
                    )}
                  >
                    {/* soft radial glow */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(circle at 50% 55%, color-mix(in oklab, var(--gold) 18%, transparent), transparent 65%)',
                      }}
                    />
                    {/* sparkles (subtle) */}
                    <svg
                      viewBox="0 0 20 20"
                      className="absolute top-1 right-1.5 w-1.5 h-1.5 text-[var(--gold)]/70"
                      aria-hidden
                    >
                      <path
                        d="M10 1 L12 8 L19 10 L12 12 L10 19 L8 12 L1 10 L8 8 Z"
                        fill="currentColor"
                      />
                    </svg>
                    <svg
                      viewBox="0 0 20 20"
                      className="absolute bottom-1 left-1.5 w-1 h-1 text-[var(--gold)]/60"
                      aria-hidden
                    >
                      <path
                        d="M10 1 L12 8 L19 10 L12 12 L10 19 L8 12 L1 10 L8 8 Z"
                        fill="currentColor"
                      />
                    </svg>
                    <Trophy className="relative w-8 h-8 text-[var(--gold)]" strokeWidth={1.6} />
                  </div>
                </div>
              );
            })()}
        </div>

        {/* Spacer to push toggle button area */}
        <div className="mt-auto" />
      </div>
    </div>
  );
}

/**
 * Viewport-gated slide thumbnail for the playback sidebar. Scenes far outside
 * the viewport render SlideThumbnail's cheap placeholder instead of a full
 * SlideCanvas — which also spares every off-screen video element its
 * `preload="metadata"` fetch when the classroom opens. The placeholder keeps
 * the same box size, so gating never shifts layout.
 */
function LazySlideThumbnail({
  slide,
  sceneId,
  viewportSize,
  viewportRatio,
  size,
}: {
  readonly slide: SlideContent['canvas'];
  readonly sceneId: string;
  readonly viewportSize: number;
  readonly viewportRatio: number;
  readonly size: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useNearViewport(ref);
  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      <SlideThumbnail
        slide={slide}
        sceneId={sceneId}
        viewportSize={viewportSize}
        viewportRatio={viewportRatio}
        size={size}
        visible={visible}
      />
    </div>
  );
}
