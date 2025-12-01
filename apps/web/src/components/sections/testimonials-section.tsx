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
    <section className="py-24 md:py-32 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
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
              <Card className="flex flex-col h-full hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200">
                <CardContent className="p-6 flex-1 flex flex-col">
                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>

                  {/* Content */}
                  <div className="mb-6 flex-1">
                    <Quote className="w-6 h-6 text-gray-300 dark:text-gray-700 mb-2" />
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {testimonial.content}
                    </p>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {testimonial.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
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
