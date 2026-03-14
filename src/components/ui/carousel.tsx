"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselApi = EmblaCarouselType;

type CarouselContextValue = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }
  return context;
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    opts?: Parameters<typeof useEmblaCarousel>[0];
    plugins?: Parameters<typeof useEmblaCarousel>[1];
    orientation?: "horizontal" | "vertical";
    setApi?: (api: CarouselApi) => void;
  }
>(
  (
    {
      opts,
      plugins,
      orientation = "horizontal",
      setApi,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    );
    const [canScrollPrev, setCanScrollPrev] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev();
    }, [api]);
    const scrollNext = React.useCallback(() => {
      api?.scrollNext();
    }, [api]);

    React.useEffect(() => {
      if (!api) return;
      setApi?.(api);
      const onSelect = () => {
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
      };
      onSelect();
      api.on("select", onSelect);
      return () => api.off("select", onSelect);
    }, [api, setApi]);

    const value = React.useMemo(
      () => ({
        carouselRef,
        api,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }),
      [carouselRef, api, scrollPrev, scrollNext, canScrollPrev, canScrollNext]
    );

    return (
      <CarouselContext.Provider value={value}>
        <div
          ref={ref}
          className={cn("relative w-full", className)}
          {...props}
        >
          <div
            ref={carouselRef}
            className="overflow-hidden"
          >
            {children}
          </div>
        </div>
      </CarouselContext.Provider>
    );
  }
);
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex -ml-4", className)}
    {...props}
  />
));
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    aria-roledescription="slide"
    className={cn("min-w-0 shrink-0 pl-4", className)}
    {...props}
  />
));
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { scrollPrev, canScrollPrev } = useCarousel();
  return (
    <Button
      ref={ref}
      variant="secondary"
      size="icon"
      className={cn(
        "absolute left-0 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border border-surface-border bg-surface-card/90 hover:bg-surface-card hover:border-electric-blue/50 hover:text-electric-blue sm:h-12 sm:w-12",
        !canScrollPrev && "opacity-50 pointer-events-none",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      aria-label="前へ"
      data-testid="carousel-previous"
      {...props}
    >
      <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
    </Button>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { scrollNext, canScrollNext } = useCarousel();
  return (
    <Button
      ref={ref}
      variant="secondary"
      size="icon"
      className={cn(
        "absolute right-0 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border border-surface-border bg-surface-card/90 hover:bg-surface-card hover:border-electric-blue/50 hover:text-electric-blue sm:h-12 sm:w-12",
        !canScrollNext && "opacity-50 pointer-events-none",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      aria-label="次へ"
      data-testid="carousel-next"
      {...props}
    >
      <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
    </Button>
  );
});
CarouselNext.displayName = "CarouselNext";

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
};
