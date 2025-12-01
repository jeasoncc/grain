import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const testimonials = [
  {
    name: "张三",
    role: "网络小说作家",
    content: "Novel Editor 彻底改变了我的写作流程。树形大纲功能让我可以轻松管理复杂的剧情线，角色数据库也非常实用。",
    rating: 5,
    avatar: "👤",
  },
  {
    name: "李四",
    role: "独立作者",
    content: "作为一名全职写作的自由职业者，我需要在不同设备间切换。Novel Editor 的离线功能和自动备份让我非常安心。",
    rating: 5,
    avatar: "👤",
  },
  {
    name: "王五",
    role: "学生创作者",
    content: "界面简洁美观，功能强大但不过于复杂。专注模式让我能够静下心来创作，字数统计功能也帮我保持了良好的写作习惯。",
    rating: 5,
    avatar: "👤",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32 bg-white dark:bg-gray-900 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-0 w-72 h-72 bg-gray-100/30 dark:bg-gray-800/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 left-0 w-72 h-72 bg-gray-100/30 dark:bg-gray-800/30 rounded-full blur-3xl"></div>
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <SectionHeader
            title="用户评价"
            description="听听用户们是怎么说的"
            subtitle="Testimonials"
          />
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal
              key={index}
              direction="up"
              delay={index * 100}
            >
              <Card className="group flex flex-col h-full hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-transparent to-gray-50/0 dark:from-gray-800/0 dark:to-gray-900/0 opacity-0 group-hover:opacity-100 group-hover:from-white/50 dark:group-hover:from-gray-800/30 transition-all duration-500 pointer-events-none"></div>
                <CardContent className="p-8 flex-1 flex flex-col relative z-10">
                  {/* Rating */}
                  <div className="flex gap-1.5 mb-6">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-gray-900 dark:fill-white text-gray-300 dark:text-gray-700 transition-transform duration-300 group-hover:scale-125"
                        style={{ transitionDelay: `${i * 50}ms` }}
                      />
                    ))}
                  </div>

                  {/* Content */}
                  <div className="mb-8 flex-1">
                    <Quote className="w-8 h-8 text-gray-300 dark:text-gray-700 mb-4 opacity-40 group-hover:opacity-100 transition-opacity duration-300" />
                    <p className="text-gray-700 dark:text-gray-300 leading-[1.8] text-[15px] group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300 font-light">
                      {testimonial.content}
                    </p>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-4 pt-6 border-t border-gray-200/50 dark:border-gray-800/50">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300 text-[15px]">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-light">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
