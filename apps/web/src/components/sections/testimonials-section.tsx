"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote, Sparkles, Clock } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

// 使用 UI Avatars 生成头像
const getAvatarUrl = (name: string, index: number) => {
  const encodedName = encodeURIComponent(name);
  // 使用不同的背景颜色
  const colors = ["6366f1", "8b5cf6", "ec4899", "f59e0b", "10b981", "3b82f6"];
  const color = colors[index % colors.length];
  return `https://ui-avatars.com/api/?name=${encodedName}&size=128&background=${color}&color=fff&bold=true&font-size=0.5`;
};

const testimonials = [
  {
    name: "张明",
    role: "网络小说作家",
    content: "Novel Editor 彻底改变了我的写作流程。树形大纲功能让我可以轻松管理复杂的剧情线，角色数据库也非常实用。",
    rating: 5,
    verified: true,
    time: "2周前",
  },
  {
    name: "李雪",
    role: "独立作者",
    content: "作为一名全职写作的自由职业者，我需要在不同设备间切换。Novel Editor 的离线功能和自动备份让我非常安心。",
    rating: 5,
    verified: true,
    time: "1个月前",
  },
  {
    name: "王强",
    role: "学生创作者",
    content: "界面简洁美观，功能强大但不过于复杂。专注模式让我能够静下心来创作，字数统计功能也帮我保持了良好的写作习惯。",
    rating: 5,
    verified: false,
    time: "3周前",
  },
  {
    name: "陈雨",
    role: "兼职写手",
    content: "最喜欢的是全局搜索功能，可以快速找到任何场景和角色。写作统计面板也让我清楚了解自己的创作进度，非常有成就感。",
    rating: 5,
    verified: true,
    time: "1周前",
  },
  {
    name: "刘阳",
    role: "业余小说家",
    content: "之前用过很多写作软件，Novel Editor 是我用过最顺手的。命令面板和快捷键设计很人性化，大大提升了我的创作效率。",
    rating: 5,
    verified: false,
    time: "2个月前",
  },
  {
    name: "赵琳",
    role: "职业编剧",
    content: "作为编剧，我需要管理大量角色和场景。Novel Editor 的角色管理和世界观构建功能完美满足了我的需求，强烈推荐！",
    rating: 5,
    verified: true,
    time: "3周前",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32 bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
      {/* 精致的背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-gray-200/30 dark:bg-gray-800/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }}></div>
        <div className="absolute bottom-1/3 left-0 w-96 h-96 bg-gray-200/30 dark:bg-gray-800/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }}></div>
      </div>
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%), linear-gradient(0deg, transparent 0%, currentColor 50%, transparent 100%)`,
          backgroundSize: "50px 50px",
        }}></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <SectionHeader
            title="用户评价"
            description="听听用户们是怎么说的"
            subtitle="Testimonials"
          />
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal
              key={index}
              direction="up"
              delay={index * 50}
            >
              <Card className="group flex flex-col h-full hover:-translate-y-2 transition-all duration-300 relative overflow-hidden shadow-lg hover:shadow-xl">
                {/* 精致的渐变叠加层 */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-transparent to-gray-50/0 dark:from-gray-800/0 dark:to-gray-900/0 opacity-0 group-hover:opacity-100 group-hover:from-white/50 dark:group-hover:from-gray-800/30 transition-all duration-500 pointer-events-none"></div>
                
                {/* 装饰性边框高光 */}
                <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-gray-200/50 dark:group-hover:border-gray-700/50 transition-colors duration-300 pointer-events-none"></div>
                
                {/* 装饰性角落 */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100/10 dark:bg-gray-800/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <CardContent className="p-6 flex-1 flex flex-col relative z-10">
                  {/* Rating - 更精致的星星 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-1">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-4 h-4 transition-all duration-300",
                            "fill-gray-900 dark:fill-white text-gray-300 dark:text-gray-700",
                            "group-hover:scale-125 group-hover:fill-yellow-400 dark:group-hover:fill-yellow-400"
                          )}
                          style={{ transitionDelay: `${i * 50}ms` }}
                        />
                      ))}
                    </div>
                    {testimonial.time && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{testimonial.time}</span>
                      </div>
                    )}
                  </div>

                  {/* Quote icon - 更精致 */}
                  <div className="relative mb-4">
                    <Quote className="w-10 h-10 text-gray-300 dark:text-gray-700 opacity-40 group-hover:opacity-100 transition-opacity duration-300 absolute -left-1 -top-1" />
                    <Quote className="w-10 h-10 text-gray-900/5 dark:text-white/5 opacity-100" />
                  </div>

                  {/* Content */}
                  <div className="mb-6 flex-1">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300 relative z-10">
                      {testimonial.content}
                    </p>
                  </div>

                  {/* Author - 更精致的设计 */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200/50 dark:border-gray-800/50 relative">
                    <div className="relative flex-shrink-0">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 group-hover:ring-gray-300 dark:group-hover:ring-gray-600 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                        <img
                          src={getAvatarUrl(testimonial.name, index)}
                          alt={testimonial.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {/* 认证标识 */}
                      {testimonial.verified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center ring-2 ring-white dark:ring-gray-900 group-hover:scale-110 transition-transform duration-300">
                          <Sparkles className="w-3 h-3 text-white dark:text-gray-900" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <div className="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                          {testimonial.name}
                        </div>
                        {testimonial.verified && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                            已认证
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
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
